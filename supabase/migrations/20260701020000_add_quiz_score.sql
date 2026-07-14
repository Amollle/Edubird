-- Adds a place to store the user's actual quiz score for a generated
-- passage, so history/profile pages can show real results instead of a
-- hardcoded placeholder.

alter table public.generation_history
  add column if not exists score_percent integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'generation_history_score_percent_range'
  ) then
    alter table public.generation_history
      add constraint generation_history_score_percent_range
      check (score_percent is null or (score_percent >= 0 and score_percent <= 100));
  end if;
end
$$;
