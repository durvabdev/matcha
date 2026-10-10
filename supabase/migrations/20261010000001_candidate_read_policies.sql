-- A recruiter can read their own recruiters row (needed by the policies below).
create policy "recruiters read self" on public.recruiters
  for select to authenticated
  using (id = (select auth.uid()));

-- Any signed-in recruiter can read candidates. Anyone else sees nothing.
create policy "recruiters read candidates" on public.candidates
  for select to authenticated
  using (exists (select 1 from public.recruiters r where r.id = (select auth.uid())));

create policy "recruiters read candidate_experiences" on public.candidate_experiences
  for select to authenticated
  using (exists (select 1 from public.recruiters r where r.id = (select auth.uid())));

create policy "recruiters read candidate_education" on public.candidate_education
  for select to authenticated
  using (exists (select 1 from public.recruiters r where r.id = (select auth.uid())));
