-- ============================================================================
-- Push notifications
-- One row per browser/device a user has enabled notifications on.
-- ============================================================================

create extension if not exists pg_net;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_id_idx on push_subscriptions(profile_id);

alter table push_subscriptions enable row level security;

create policy "push_subs_select_own" on push_subscriptions for select
  using (profile_id = (select auth.uid()));
create policy "push_subs_insert_own" on push_subscriptions for insert
  with check (profile_id = (select auth.uid()));
create policy "push_subs_delete_own" on push_subscriptions for delete
  using (profile_id = (select auth.uid()));

-- ---------- Trigger: call the send-push edge function on relevant inserts ----------
-- The project's Supabase managed role isn't allowed to `alter database ... set`
-- custom GUCs, so the edge function URL + anon key (public, safe to embed) are
-- inlined directly below instead of read from settings. If you ever migrate to
-- a different Supabase project, update these two literals.

create or replace function public.trigger_push_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://opbhvrbjwjupocjicepr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wYmh2cmJqd2p1cG9jamljZXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDg5NTIsImV4cCI6MjEwMjcyNDk1Mn0.tAz6UV-YSTgrExy3jtg8_rCAa6O7Vn5TusQWQeRJScw'
    ),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists notify_chat_message on chat_messages;
create trigger notify_chat_message after insert on chat_messages
  for each row execute function trigger_push_notify();

drop trigger if exists notify_project_version on project_versions;
create trigger notify_project_version after insert on project_versions
  for each row execute function trigger_push_notify();

drop trigger if exists notify_revision_comment on revision_comments;
create trigger notify_revision_comment after insert on revision_comments
  for each row execute function trigger_push_notify();

drop trigger if exists notify_project_member on project_members;
create trigger notify_project_member after insert on project_members
  for each row execute function trigger_push_notify();
