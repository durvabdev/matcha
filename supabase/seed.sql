insert into public.companies (slug, name) values
  ('acme', 'Acme'),
  ('globex', 'Globex');

-- One free search each. searches_used = 0 means one search remaining.
update public.company_plans
set plan = 'free', searches_used = 0
where company_id in (select id from public.companies);
