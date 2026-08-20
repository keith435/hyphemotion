-- ============================================================================
-- Performance fixes
-- The app was slow because every foreign key used in RLS checks and joins
-- had no covering index, so Postgres was doing a full table scan on nearly
-- every query (project membership checks, chat, revisions, sales deals).
-- Also tightens 4 RLS policies that were re-checking auth.uid() per row
-- instead of once per query.
-- ============================================================================

-- ---------- Missing FK indexes ----------
create index if not exists chat_channels_project_id_idx on chat_channels(project_id);
create index if not exists chat_messages_channel_id_idx on chat_messages(channel_id);
create index if not exists chat_messages_sender_id_idx on chat_messages(sender_id);
create index if not exists project_members_profile_id_idx on project_members(profile_id);
create index if not exists project_versions_project_id_idx on project_versions(project_id);
create index if not exists project_versions_uploaded_by_idx on project_versions(uploaded_by);
create index if not exists projects_created_by_idx on projects(created_by);
create index if not exists projects_deal_id_idx on projects(deal_id);
create index if not exists revision_comments_author_id_idx on revision_comments(author_id);
create index if not exists revision_comments_version_id_idx on revision_comments(version_id);
create index if not exists sales_deals_owner_id_idx on sales_deals(owner_id);

-- is_project_member() looks up project_members by (project_id, profile_id) on
-- every RLS-guarded query across the whole app — this is the hottest path.
create index if not exists project_members_lookup_idx on project_members(profile_id, project_id);

-- ---------- RLS: stop re-evaluating auth.uid() per row ----------
drop policy if exists "profiles_update_self_or_admin" on profiles;
create policy "profiles_update_self_or_admin" on profiles for update
  using (id = (select auth.uid()) or is_admin());

drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects for insert with check ((select auth.uid()) is not null);

drop policy if exists "messages_insert" on chat_messages;
create policy "messages_insert" on chat_messages for insert with check (
  sender_id = (select auth.uid()) and
  exists (
    select 1 from chat_channels c
    where c.id = channel_id
      and (
        (c.type = 'sales_team' and is_sales_or_admin())
        or (c.type = 'project' and is_project_member(c.project_id))
      )
  )
);

drop policy if exists "comments_insert" on revision_comments;
create policy "comments_insert" on revision_comments for insert with check (
  author_id = (select auth.uid()) and
  exists (select 1 from project_versions v where v.id = version_id and is_project_member(v.project_id))
);
