-- A recruiter's natural-language search brief and the structured filters derived from it.
-- Visible to the whole company; created by any of its recruiters. Create and read only.
create table public.saved_briefs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  brief      text not null check (length(trim(brief)) > 0),
  filters    jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  created_at timestamptz not null default now()
);

-- Matches the API ordering: newest first, id as tie-breaker.
create index saved_briefs_company_created_idx
  on public.saved_briefs (company_id, created_at desc, id desc);

alter table public.saved_briefs enable row level security;

-- Grants for this table only: no anon access, and no update/delete for anyone.
revoke all on public.saved_briefs from anon, authenticated;
grant select, insert on public.saved_briefs to authenticated;

-- Company comes from the caller's recruiters row, never from the request.
create policy "company reads saved_briefs" on public.saved_briefs
  for select to authenticated
  using (company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid())));

create policy "company inserts saved_briefs" on public.saved_briefs
  for insert to authenticated
  with check (company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid())));
