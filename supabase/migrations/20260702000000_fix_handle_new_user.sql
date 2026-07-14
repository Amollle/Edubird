-- The 20260701010000_remove_stripe_tokens.sql migration dropped
-- profiles.token_balance, but handle_new_user() (the trigger that runs on
-- every new signup) still tried to insert a token_balance value. That made
-- every new signup fail with "Database error saving new user". This
-- redefines the function without the token_balance column.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, grade_level, avatar_url, is_guest)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Learner'),
    coalesce(new.raw_user_meta_data ->> 'grade_level', 'high'),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    false
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    grade_level = excluded.grade_level,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;
