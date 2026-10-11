drop policy "company reads shortlist_people" on public.shortlist_people;

create policy "company reads shortlist_people" on public.shortlist_people
  for select to authenticated
  using (exists (
    select 1 from public.shortlists s
    where s.id = shortlist_id
      and s.company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid()))
  ));
