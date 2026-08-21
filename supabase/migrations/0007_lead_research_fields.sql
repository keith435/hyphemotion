-- Backs the automated daily lead-research pipeline (Apollo-sourced prospects,
-- drafted first-touch emails) and surfaces it on the Sales Pipeline board.
-- Written idempotently since these were applied directly against production
-- while iterating with the automation before this migration was written up.

create table if not exists public.sourced_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  domain text,
  industry text,
  decision_maker text,
  role text,
  email text,
  fit_score smallint check (fit_score between 1 and 10),
  problem_identified text,
  video_opportunity text,
  outreach_angle text,
  email_subject text,
  email_body text,
  status text not null default 'Not sent'
    check (status in ('Not sent','Sent','Replied','No response','Booked call')),
  notes text,
  date_added date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sourced_leads_domain_unique
  on public.sourced_leads (lower(domain)) where domain is not null;
create unique index if not exists sourced_leads_company_unique
  on public.sourced_leads (lower(company));

alter table public.sourced_leads enable row level security;

do $$ begin
  create policy sourced_leads_select on public.sourced_leads
    for select using (is_sales_or_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sourced_leads_insert on public.sourced_leads
    for insert with check (is_sales_or_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sourced_leads_update on public.sourced_leads
    for update using (is_sales_or_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sourced_leads_delete on public.sourced_leads
    for delete using (is_admin());
exception when duplicate_object then null; end $$;

-- Link + mirror the research fields onto sales_deals so the pipeline board
-- (the thing the sales team actually looks at) can show them without a join.
alter table public.sales_deals
  add column if not exists sourced_lead_id uuid references public.sourced_leads(id),
  add column if not exists industry text,
  add column if not exists role text,
  add column if not exists fit_score smallint check (fit_score between 1 and 10),
  add column if not exists problem_identified text,
  add column if not exists video_opportunity text,
  add column if not exists outreach_angle text,
  add column if not exists email_subject text,
  add column if not exists email_body text;
