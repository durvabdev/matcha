create table public.companies (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('acme', 'globex')),
  name text not null
);

-- id is the auth.users id. Email and password live in Auth, not here.
create table public.recruiters (
  id         uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id)
);

create table public.candidates (
  id                       text primary key,
  full_name                text not null,
  avatar_url               text,
  headline                 text,
  current_title            text,
  current_company          text,
  current_company_logo_url text,
  role                     text,
  seniority                text,
  years_experience         int,
  city                     text,
  state                    text,
  country                  text,
  open_to_work             boolean not null,
  skills                   text[] not null
);

create table public.candidate_experiences (
  id               bigint generated always as identity primary key,
  candidate_id     text not null references public.candidates (id) on delete cascade,
  title            text,
  company          text,
  company_logo_url text,
  company_type     text,
  start_year       int,
  end_year         int,
  description      text
);

create table public.candidate_education (
  id              bigint generated always as identity primary key,
  candidate_id    text not null references public.candidates (id) on delete cascade,
  school          text,
  degree          text,
  field           text,
  graduation_year int
);

-- No policies: anon and authenticated tokens cannot read these tables.
-- The server uses the secret key.
alter table public.companies enable row level security;
alter table public.recruiters enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_experiences enable row level security;
alter table public.candidate_education enable row level security;
