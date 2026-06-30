-- Abonnements / dépenses récurrentes (mensuelles).
-- À exécuter dans Supabase → SQL Editor → Run. Idempotent.

create table if not exists subscriptions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households on delete cascade,
  name          text not null,
  amount_cents  bigint not null,                 -- montant positif (charge récurrente)
  scope         text not null check (scope in ('shared','personal')),
  owner_id      uuid references profiles,
  category_id   uuid references categories on delete set null,
  icon          text not null default 'repeat',
  color         text not null default '#6457F9',
  day_of_month  int not null check (day_of_month between 1 and 31),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_sub_household on subscriptions(household_id);

alter table subscriptions enable row level security;

-- Mêmes règles de confidentialité que les catégories :
-- partagé visible par tous ; perso visible par son owner (+ partenaire si partage).
drop policy if exists "subscriptions_select" on subscriptions;
drop policy if exists "subscriptions_insert" on subscriptions;
drop policy if exists "subscriptions_update" on subscriptions;
drop policy if exists "subscriptions_delete" on subscriptions;

create policy "subscriptions_select" on subscriptions for select
  using (household_id = auth_household_id()
         and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id)));
create policy "subscriptions_insert" on subscriptions for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "subscriptions_update" on subscriptions for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "subscriptions_delete" on subscriptions for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

alter publication supabase_realtime add table subscriptions;
