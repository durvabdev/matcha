-- Owners can rename and delete their own shortlists. Only the name is editable,
-- so company_id / recruiter_id can't be changed through the API.
revoke update on public.shortlists from authenticated;
grant update (name) on public.shortlists to authenticated;

create policy "owner renames shortlists" on public.shortlists
  for update to authenticated
  using (recruiter_id = (select auth.uid()))
  with check (recruiter_id = (select auth.uid()));

create policy "owner deletes shortlists" on public.shortlists
  for delete to authenticated
  using (recruiter_id = (select auth.uid()));
