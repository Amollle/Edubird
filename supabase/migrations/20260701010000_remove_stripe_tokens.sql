-- Removes the token/credits and Stripe purchase objects that are no longer
-- used now that generation is unlimited and Stripe has been removed from
-- the app.

drop table if exists public.token_ledger;
drop table if exists public.purchase_records;

alter table public.profiles drop column if exists token_balance;
alter table public.generation_history drop column if exists tokens_spent;
