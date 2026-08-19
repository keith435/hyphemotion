-- ============================================================================
-- Hyphemotion — initial schema
-- Run this in Supabase SQL Editor (or via `supabase db push`) on a fresh project.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('admin', 'sales', 'production');
create type deal_stage as enum ('lead', 'contacted', 'quoted', 'negotiating', 'won', 'lost');
create type project_status as enum ('brief', 'storyboard', 'animation', 'revisions', 'delivered', 'archived');
create type channel_type as enum ('project', 'sales_team');
create type version_status as enum ('pending_review', 'changes_requested', 'approved');

-- ---------- Profiles ----------
-- One row per auth.users user. Created automatically by trigger below.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role user_role not null default 'production',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
-- New users default to 'production' role; promote to 'admin'/'sales' manually
-- (Supabase Table Editor -> profiles -> edit role) or via the admin UI once built.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Sales pipeline ----------
create table sales_deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  client_email text,
  client_company text,
  value numeric(12,2) default 0,
  stage deal_stage not null default 'lead',
  owner_id uuid references profiles(id) on delete set null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Projects ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references sales_deals(id) on delete set null,
  name text not null,
  client_name text not null,
  project_type text default '',
  status project_status not null default 'brief',
  deadline date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  project_id uuid references projects(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);

-- ---------- Chat ----------
create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  type channel_type not null,
  project_id uuid references projects(id) on delete cascade, -- null for the sales_team channel
  name text not null,
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references chat_channels(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  body text default '',
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

-- ---------- Revisions / versioning ----------
create table project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version_number int not null,
  title text default '',
  file_url text not null,
  file_name text,
  file_type text, -- 'video' | 'image' | 'other'
  status version_status not null default 'pending_review',
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table revision_comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references project_versions(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  timestamp_seconds numeric, -- pin on a video's timeline, null if not applicable
  x_pct numeric,             -- pin on an image, 0-100
  y_pct numeric,
  created_at timestamptz not null default now()
);

-- ---------- updated_at helper ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_deals_updated_at before update on sales_deals
  for each row execute function set_updated_at();
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- ---------- Auto-create project channel + first version slot on project insert ----------
create or replace function handle_new_project()
returns trigger as $$
begin
  insert into public.chat_channels (type, project_id, name)
  values ('project', new.id, new.name);

  -- creator is automatically a project member
  if new.created_by is not null then
    insert into public.project_members (project_id, profile_id)
    values (new.id, new.created_by)
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on projects
  for each row execute function handle_new_project();

-- ---------- Seed the single Sales Team channel ----------
insert into chat_channels (type, project_id, name)
values ('sales_team', null, 'Sales Team');

-- ============================================================================
-- Row Level Security
-- Model: every authenticated teammate can read/write most of the workspace
-- (this is an internal small-studio tool, not a multi-tenant SaaS). The one
-- real boundary is project chat/files: only assigned project_members + admins
-- can see a project's channel and revision files. Everyone (admin + sales)
-- can see the sales pipeline and Sales Team channel; production-only users
-- cannot.
-- ============================================================================

alter table profiles enable row level security;
alter table sales_deals enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table chat_channels enable row level security;
alter table chat_messages enable row level security;
alter table project_versions enable row level security;
alter table revision_comments enable row level security;

-- helper: is current user admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- helper: is current user sales or admin?
create or replace function is_sales_or_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('sales', 'admin')
  );
$$ language sql stable security definer;

-- helper: is current user a member of a given project?
create or replace function is_project_member(pid uuid)
returns boolean as $$
  select exists (
    select 1 from project_members where project_id = pid and profile_id = auth.uid()
  ) or is_admin();
$$ language sql stable security definer;

-- profiles: everyone can read all profiles (needed for @mentions, assigning), only self/admin can update
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_self_or_admin" on profiles for update
  using (id = auth.uid() or is_admin());

-- sales_deals: sales + admin only
create policy "deals_select" on sales_deals for select using (is_sales_or_admin());
create policy "deals_insert" on sales_deals for insert with check (is_sales_or_admin());
create policy "deals_update" on sales_deals for update using (is_sales_or_admin());
create policy "deals_delete" on sales_deals for delete using (is_admin());

-- projects: members + admin can read; sales+admin can create (post-deal or manual)
create policy "projects_select" on projects for select using (is_project_member(id));
create policy "projects_insert" on projects for insert with check (auth.uid() is not null);
create policy "projects_update" on projects for update using (is_project_member(id));
create policy "projects_delete" on projects for delete using (is_admin());

-- project_members: visible to members of that project; admin/creators can add members
create policy "members_select" on project_members for select using (is_project_member(project_id));
create policy "members_insert" on project_members for insert with check (is_project_member(project_id) or is_admin());
create policy "members_delete" on project_members for delete using (is_admin());

-- chat_channels: sales_team visible to sales/admin; project channels visible to project members
create policy "channels_select" on chat_channels for select using (
  (type = 'sales_team' and is_sales_or_admin())
  or (type = 'project' and is_project_member(project_id))
);
create policy "channels_insert" on chat_channels for insert with check (is_admin());

-- chat_messages: follow channel visibility
create policy "messages_select" on chat_messages for select using (
  exists (
    select 1 from chat_channels c
    where c.id = channel_id
      and (
        (c.type = 'sales_team' and is_sales_or_admin())
        or (c.type = 'project' and is_project_member(c.project_id))
      )
  )
);
create policy "messages_insert" on chat_messages for insert with check (
  sender_id = auth.uid() and
  exists (
    select 1 from chat_channels c
    where c.id = channel_id
      and (
        (c.type = 'sales_team' and is_sales_or_admin())
        or (c.type = 'project' and is_project_member(c.project_id))
      )
  )
);

-- project_versions / revision_comments: follow project membership
create policy "versions_select" on project_versions for select using (is_project_member(project_id));
create policy "versions_insert" on project_versions for insert with check (is_project_member(project_id));
create policy "versions_update" on project_versions for update using (is_project_member(project_id));

create policy "comments_select" on revision_comments for select using (
  exists (select 1 from project_versions v where v.id = version_id and is_project_member(v.project_id))
);
create policy "comments_insert" on revision_comments for insert with check (
  author_id = auth.uid() and
  exists (select 1 from project_versions v where v.id = version_id and is_project_member(v.project_id))
);

-- ============================================================================
-- Realtime: enable replication for chat + revisions so the UI updates live
-- ============================================================================
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table project_versions;
alter publication supabase_realtime add table revision_comments;
alter publication supabase_realtime add table sales_deals;
alter publication supabase_realtime add table projects;
