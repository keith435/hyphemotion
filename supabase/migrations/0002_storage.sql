-- ============================================================================
-- Storage buckets for project revisions and chat attachments
-- Run after 0001_init.sql
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('revisions', 'revisions', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Any authenticated user can upload/read (studio is a trusted small team;
-- fine-grained project-level file access is enforced at the DB row level for
-- project_versions/chat_messages — the file itself just needs a stable public
-- URL to embed in the app).
create policy "revisions_read" on storage.objects for select
  using (bucket_id = 'revisions');
create policy "revisions_write" on storage.objects for insert
  with check (bucket_id = 'revisions' and auth.uid() is not null);

create policy "chat_attachments_read" on storage.objects for select
  using (bucket_id = 'chat-attachments');
create policy "chat_attachments_write" on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and auth.uid() is not null);
