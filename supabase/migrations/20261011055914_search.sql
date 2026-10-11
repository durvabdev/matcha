-- Frozen search snapshots. Writes go through create_search (SECURITY DEFINER); clients read only.

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  recruiter_id uuid not null references public.recruiters (id),
  brief text,
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  total int not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create table public.search_results (
  search_id uuid not null references public.searches (id) on delete cascade,
  position int not null check (position >= 1),
  candidate_id text not null references public.candidates (id),
  primary key (search_id, position)
);

create index searches_company_created_idx on public.searches (company_id, created_at desc, id desc);

alter table public.searches enable row level security;
alter table public.search_results enable row level security;

revoke all on public.searches from anon, authenticated;
revoke all on public.search_results from anon, authenticated;
grant select on public.searches to authenticated;
grant select on public.search_results to authenticated;

create policy "company reads searches" on public.searches
  for select to authenticated
  using (company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid())));

create policy "company reads search_results" on public.search_results
  for select to authenticated
  using (exists (
    select 1 from public.searches s
    where s.id = search_results.search_id
      and s.company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid()))
  ));
