-- A company has many shortlists; each belongs to one recruiter of that company.
create table public.shortlists (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id),
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  created_at   timestamptz not null default now()
);
create index on public.shortlists (company_id);

-- Composite primary key makes adding the same candidate twice a no-op.
create table public.shortlist_people (
  shortlist_id uuid not null references public.shortlists (id) on delete cascade,
  candidate_id text not null references public.candidates (id) on delete cascade,
  added_at     timestamptz not null default now(),
  primary key (shortlist_id, candidate_id)
);

alter table public.shortlists enable row level security;
alter table public.shortlist_people enable row level security;

-- The whole company can see its shortlists; only the owner can create/change them.
create policy "company reads shortlists" on public.shortlists
  for select to authenticated
  using (company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid())));

create policy "recruiter creates own shortlists" on public.shortlists
  for insert to authenticated
  with check (
    recruiter_id = (select auth.uid())
    and company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid()))
  );

create policy "company reads shortlist_people" on public.shortlist_people
  for select to authenticated
  using (exists (select 1 from public.shortlists s where s.id = shortlist_id));

create policy "owner adds shortlist_people" on public.shortlist_people
  for insert to authenticated
  with check (exists (
    select 1 from public.shortlists s
    where s.id = shortlist_id and s.recruiter_id = (select auth.uid())
  ));

create policy "owner removes shortlist_people" on public.shortlist_people
  for delete to authenticated
  using (exists (
    select 1 from public.shortlists s
    where s.id = shortlist_id and s.recruiter_id = (select auth.uid())
  ));
