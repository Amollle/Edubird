-- Creates a private Storage bucket to hold a JSON copy of every generated
-- reading passage (title/summary/text/questions), alongside the existing
-- relational rows in public.reading_passages / public.reading_questions.

insert into storage.buckets (id, name, public)
values ('passages', 'passages', false)
on conflict (id) do nothing;

-- Only the service role (used server-side via the admin client) can read or
-- write these files; no anon/authenticated client-side access is granted,
-- since all uploads/reads happen through server API routes.
create policy "passages_service_role_all" on storage.objects
  for all
  to service_role
  using (bucket_id = 'passages')
  with check (bucket_id = 'passages');
