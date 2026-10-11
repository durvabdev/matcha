create or replace function public.match_candidates(filters jsonb)
returns table (id text, score int)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  f jsonb := coalesce(filters, '{}'::jsonb);
  v_skills text[];
  v_role text;
  v_seniority text;
  v_city text;
  v_state text;
  v_country text;
  v_years jsonb;
  v_open boolean;
  v_company_type text;
  v_degree text;
  v_school text;
  v_field text;
  v_current_company text;
  v_company text;
  v_title text;
  v_current_title text;
begin
  -- Unsupported alone matches nobody. Next to real filters it is only a note for the UI.
  if (
    (jsonb_typeof(f->'unsupported') = 'array' and jsonb_array_length(f->'unsupported') > 0)
    or (jsonb_typeof(f->'unsupported') = 'boolean' and (f->>'unsupported')::boolean)
  ) and (f - 'unsupported') = '{}'::jsonb then
    return;
  end if;

  if f ? 'skills' and jsonb_typeof(f->'skills') is distinct from 'array' then
    return;
  end if;

  select coalesce(array_agg(lower(trim(s))), '{}')
    into v_skills
  from jsonb_array_elements_text(coalesce(f->'skills', '[]'::jsonb)) s
  where trim(s) <> '';

  v_role := nullif(trim(coalesce(f->>'role', '')), '');
  v_seniority := nullif(lower(trim(coalesce(f->>'seniority', ''))), '');
  v_city := nullif(trim(coalesce(f->>'city', '')), '');
  v_state := nullif(trim(coalesce(f->>'state', '')), '');
  v_country := nullif(trim(coalesce(f->>'country', '')), '');
  v_years := f->'years_experience';
  if jsonb_typeof(v_years) not in ('object', 'array') then
    v_years := null;
  end if;
  if f ? 'open_to_work' and jsonb_typeof(f->'open_to_work') is distinct from 'boolean' then
    return;
  end if;
  v_open := case when f ? 'open_to_work' then (f->>'open_to_work')::boolean else null end;
  v_company_type := nullif(lower(trim(coalesce(f->>'company_type', ''))), '');
  v_degree := nullif(trim(coalesce(f->>'degree', '')), '');
  v_school := nullif(trim(coalesce(f->>'school', '')), '');
  v_field := nullif(trim(coalesce(f->>'field', '')), '');
  v_current_company := nullif(trim(coalesce(f->>'current_company', '')), '');
  v_company := nullif(trim(coalesce(f->>'company', '')), '');
  v_title := nullif(trim(coalesce(f->>'title', '')), '');
  v_current_title := nullif(trim(coalesce(f->>'current_title', '')), '');

  return query
  select
    c.id,
    (
      select count(*)::int
      from unnest(v_skills) fs
      where exists (select 1 from unnest(c.skills) cs where lower(cs) = fs)
    ) as score
  from public.candidates c
  where
    (cardinality(v_skills) = 0 or (
      select count(*) from unnest(v_skills) fs
      where exists (select 1 from unnest(c.skills) cs where lower(cs) = fs)
    ) = cardinality(v_skills))
    and (v_role is null or c.role ilike '%' || replace(replace(v_role, '%', '\%'), '_', '\_') || '%' escape '\')
    and (v_seniority is null or lower(c.seniority) = v_seniority)
    and (v_city is null or lower(c.city) = lower(v_city))
    and (v_state is null or lower(c.state) = lower(v_state))
    and (v_country is null or lower(c.country) = lower(v_country))
    and (v_years is null or (
      c.years_experience is not null
      and not exists (
        select 1
        from jsonb_array_elements(case jsonb_typeof(v_years) when 'array' then v_years else jsonb_build_array(v_years) end) cmp
        where not (
          case cmp->>'operator'
            when 'eq' then (cmp->>'value') ~ '^[0-9]+$' and c.years_experience = (cmp->>'value')::int
            when 'gt' then (cmp->>'value') ~ '^[0-9]+$' and c.years_experience > (cmp->>'value')::int
            when 'gte' then (cmp->>'value') ~ '^[0-9]+$' and c.years_experience >= (cmp->>'value')::int
            when 'lt' then (cmp->>'value') ~ '^[0-9]+$' and c.years_experience < (cmp->>'value')::int
            when 'lte' then (cmp->>'value') ~ '^[0-9]+$' and c.years_experience <= (cmp->>'value')::int
            else false
          end
        )
      )
    ))
    and (v_open is null or c.open_to_work = v_open)
    and (v_company_type is null or exists (
      select 1 from public.candidate_experiences e
      where e.candidate_id = c.id and lower(e.company_type) = v_company_type
    ))
    and (v_degree is null or exists (
      select 1 from public.candidate_education e
      where e.candidate_id = c.id and lower(e.degree) = lower(v_degree)
    ))
    and (v_school is null or exists (
      select 1 from public.candidate_education e
      where e.candidate_id = c.id
        and e.school ilike '%' || replace(replace(v_school, '%', '\%'), '_', '\_') || '%' escape '\'
    ))
    and (v_field is null or exists (
      select 1 from public.candidate_education e
      where e.candidate_id = c.id
        and e.field ilike '%' || replace(replace(v_field, '%', '\%'), '_', '\_') || '%' escape '\'
    ))
    and (v_current_company is null or lower(c.current_company) = lower(v_current_company)
      or exists (
        select 1 from public.candidate_experiences e
        where e.candidate_id = c.id and lower(e.company) = lower(v_current_company)
      ))
    and (v_company is null or exists (
      select 1 from public.candidate_experiences e
      where e.candidate_id = c.id and lower(e.company) = lower(v_company)
    ))
    and (v_current_title is null or
      c.current_title ilike '%' || replace(replace(v_current_title, '%', '\%'), '_', '\_') || '%' escape '\')
    -- title is candidate_experiences.title; also match current_title, which is the same job fact.
    and (v_title is null or
      c.current_title ilike '%' || replace(replace(v_title, '%', '\%'), '_', '\_') || '%' escape '\'
      or exists (
        select 1 from public.candidate_experiences e
        where e.candidate_id = c.id
          and e.title ilike '%' || replace(replace(v_title, '%', '\%'), '_', '\_') || '%' escape '\'
      ))
  order by
    2 desc,
    c.open_to_work desc,
    c.years_experience desc nulls last,
    c.id asc;
end;
$$;

revoke all on function public.match_candidates(jsonb) from public, anon;
grant execute on function public.match_candidates(jsonb) to authenticated;
