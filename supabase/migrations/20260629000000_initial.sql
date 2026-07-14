create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Learner',
  grade_level text not null default 'high',
  avatar_url text,
  token_balance integer not null default 20,
  is_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_passages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  grade_level text not null,
  length text not null,
  source text not null,
  summary text not null,
  text text not null,
  image_url text,
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id text not null references public.reading_passages(id) on delete cascade,
  sort_order integer not null,
  type text not null,
  question text not null,
  answer text not null,
  options jsonb not null default '[]'::jsonb,
  explanation text,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id text not null references public.reading_passages(id) on delete cascade,
  title text not null,
  topic text not null,
  source text not null,
  grade_level text not null,
  length text not null,
  word_count integer not null default 0,
  tokens_spent integer not null default 1,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  reference_type text,
  reference_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  token_pack integer not null,
  amount_cents integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.reading_passages enable row level security;
alter table public.reading_questions enable row level security;
alter table public.generation_history enable row level security;
alter table public.token_ledger enable row level security;
alter table public.purchase_records enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "reading_passages_select_own" on public.reading_passages
  for select using (auth.uid() = user_id);

create policy "reading_passages_insert_own" on public.reading_passages
  for insert with check (auth.uid() = user_id);

create policy "reading_questions_select_own" on public.reading_questions
  for select using (
    exists (
      select 1 from public.reading_passages p
      where p.id = reading_questions.passage_id
        and p.user_id = auth.uid()
    )
  );

create policy "reading_questions_insert_own" on public.reading_questions
  for insert with check (
    exists (
      select 1 from public.reading_passages p
      where p.id = reading_questions.passage_id
        and p.user_id = auth.uid()
    )
  );

create policy "history_select_own" on public.generation_history
  for select using (auth.uid() = user_id);

create policy "history_insert_own" on public.generation_history
  for insert with check (auth.uid() = user_id);

create policy "ledger_select_own" on public.token_ledger
  for select using (auth.uid() = user_id);

create policy "ledger_insert_own" on public.token_ledger
  for insert with check (auth.uid() = user_id);

create policy "purchase_select_own" on public.purchase_records
  for select using (auth.uid() = user_id);

create policy "purchase_insert_own" on public.purchase_records
  for insert with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, grade_level, avatar_url, token_balance, is_guest)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Learner'),
    coalesce(new.raw_user_meta_data ->> 'grade_level', 'high'),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    20,
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
