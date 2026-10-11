-- Quota + persist in one transaction. Company comes from auth.uid(), never from the caller.

create function public.create_search(p_brief text, p_filters jsonb)
returns table (search_id uuid, total int, plan text, searches_used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  rid uuid;
  v_plan text;
  v_used int;
  sid uuid;
  v_total int;
begin
  select r.company_id, r.id into cid, rid
  from public.recruiters r
  where r.id = (select auth.uid());
  if cid is null then
    raise exception 'not a recruiter';
  end if;

  update public.company_plans
  set searches_used = company_plans.searches_used + 1
  where company_plans.company_id = cid
    and (company_plans.plan = 'paid' or company_plans.searches_used < 1)
  returning company_plans.plan, company_plans.searches_used
  into v_plan, v_used;

  if v_plan is null then
    raise exception 'quota_exceeded';
  end if;

  insert into public.searches (company_id, recruiter_id, brief, filters, total)
  values (cid, rid, nullif(trim(coalesce(p_brief, '')), ''), coalesce(p_filters, '{}'::jsonb), 0)
  returning id into sid;

  insert into public.search_results (search_id, position, candidate_id)
  select sid, ordinality::int, m.id
  from public.match_candidates(coalesce(p_filters, '{}'::jsonb))
    with ordinality as m(id, score, ordinality);

  get diagnostics v_total = row_count;
  update public.searches set total = v_total where id = sid;

  return query select sid, v_total, v_plan, v_used;
end;
$$;

revoke all on function public.create_search(text, jsonb) from public, anon;
grant execute on function public.create_search(text, jsonb) to authenticated;
