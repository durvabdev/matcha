import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const candidates = JSON.parse(readFileSync('setup/candidates.json', 'utf8'))
const tag = 'c'
if (JSON.stringify(candidates).includes(`$${tag}$`)) {
  throw new Error('candidates.json contains the SQL dollar-quote tag')
}

const BATCH = 100
const statements = []
for (let i = 0; i < candidates.length; i += BATCH) {
  const body = JSON.stringify(candidates.slice(i, i + BATCH))
  statements.push(`with raw as (
  select * from jsonb_to_recordset($${tag}$${body}$${tag}$::jsonb) as x(
    id text, full_name text, avatar_url text, headline text, current_title text,
    current_company text, current_company_logo_url text, role text, seniority text,
    years_experience int, location jsonb, open_to_work boolean, skills jsonb,
    experiences jsonb, education jsonb
  )
), ins_candidates as (
  insert into public.candidates (
    id, full_name, avatar_url, headline, current_title, current_company,
    current_company_logo_url, role, seniority, years_experience,
    city, state, country, open_to_work, skills
  )
  select
    id, full_name, avatar_url, headline, current_title, current_company,
    current_company_logo_url, role, seniority, years_experience,
    location->>'city', location->>'state', location->>'country', open_to_work,
    coalesce((select array_agg(value) from jsonb_array_elements_text(skills)), '{}')
  from raw
), ins_experiences as (
  insert into public.candidate_experiences (
    candidate_id, title, company, company_logo_url, company_type, start_year, end_year, description
  )
  select r.id, e.title, e.company, e.company_logo_url, e.company_type, e.start_year, e.end_year, e.description
  from raw r
  cross join lateral jsonb_to_recordset(coalesce(r.experiences, '[]'::jsonb)) as e(
    title text, company text, company_logo_url text, company_type text,
    start_year int, end_year int, description text
  )
)
insert into public.candidate_education (candidate_id, school, degree, field, graduation_year)
select r.id, ed.school, ed.degree, ed.field, ed.graduation_year
from raw r
cross join lateral jsonb_to_recordset(coalesce(r.education, '[]'::jsonb)) as ed(
  school text, degree text, field text, graduation_year int
);`)
}

mkdirSync('supabase/seeds', { recursive: true })
writeFileSync('supabase/seeds/candidates.sql', statements.join('\n'))
