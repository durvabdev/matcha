-- Company plan/usage and Stripe webhook deliveries. Plan lives here, not on companies.

create table public.company_plans (
  company_id uuid primary key references public.companies (id),
  plan text not null default 'free' check (plan in ('free', 'paid')),
  stripe_subscription_id text,
  last_event_created bigint not null default 0,
  last_event_id text,
  searches_used int not null default 0 check (searches_used >= 0)
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  company_id uuid not null references public.companies (id),
  subscription_id text,
  event_created bigint not null,
  processed_at timestamptz not null default now()
);

alter table public.company_plans enable row level security;
alter table public.stripe_events enable row level security;

create function public.ensure_company_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_plans (company_id) values (new.id);
  return new;
end;
$$;

create trigger companies_ensure_plan
  after insert on public.companies
  for each row
  execute function public.ensure_company_plan();

insert into public.company_plans (company_id)
select id from public.companies
on conflict (company_id) do nothing;

create function public.apply_stripe_event(
  event_id text,
  type text,
  company_slug text,
  subscription_id text,
  event_created bigint,
  status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  inserted_id text;
  last_created bigint;
begin
  select id into cid from public.companies where slug = apply_stripe_event.company_slug;
  if cid is null then
    return 'ignored';
  end if;

  insert into public.stripe_events as e (id, type, company_id, subscription_id, event_created)
  values (
    apply_stripe_event.event_id,
    apply_stripe_event.type,
    cid,
    apply_stripe_event.subscription_id,
    apply_stripe_event.event_created
  )
  on conflict (id) do nothing
  returning e.id into inserted_id;

  if inserted_id is null then
    return 'duplicate';
  end if;

  select last_event_created into last_created
  from public.company_plans
  where company_id = cid
  for update;
  if not found then
    return 'applied';
  end if;

  if apply_stripe_event.event_created > last_created then
    update public.company_plans
    set
      plan = case when apply_stripe_event.status = 'active' then 'paid' else 'free' end,
      stripe_subscription_id = apply_stripe_event.subscription_id,
      last_event_created = apply_stripe_event.event_created,
      last_event_id = apply_stripe_event.event_id
    where company_id = cid;
  end if;

  return 'applied';
end;
$$;

revoke all on public.company_plans from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke all on function public.apply_stripe_event(text, text, text, text, bigint, text) from public, anon, authenticated;

grant select on public.company_plans to authenticated;
grant execute on function public.apply_stripe_event(text, text, text, text, bigint, text) to service_role;

create policy "company reads company_plans" on public.company_plans
  for select to authenticated
  using (company_id = (select r.company_id from public.recruiters r where r.id = (select auth.uid())));
