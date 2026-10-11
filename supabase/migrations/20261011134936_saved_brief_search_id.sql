alter table public.saved_briefs
  add column search_id uuid references public.searches (id) on delete set null;
