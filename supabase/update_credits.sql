-- Crédits / prêts du foyer, remboursés par mensualités.
-- À exécuter dans Supabase → SQL Editor → Run. Idempotent.

create table if not exists credits (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households on delete cascade,
  name                  text not null,
  total_amount_cents    bigint not null,                 -- montant total emprunté
  paid_amount_cents     bigint not null default 0,       -- déjà remboursé (restant = total - paid)
  monthly_payment_cents bigint not null,                 -- mensualité
  day_of_month          int not null check (day_of_month between 1 and 31),
  interest_rate_pct     numeric not null default 0,      -- taux d'emprunt annuel (%)
  end_date              date not null,                   -- échéance (dernier prélèvement)
  icon                  text not null default 'card',
  color                 text not null default '#6457F9',
  category_id           uuid references categories on delete set null,
  scope                 text not null default 'shared' check (scope in ('shared','personal')),
  owner_id              uuid references profiles,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_credit_household on credits(household_id);

-- Upgrade idempotent si la table existait déjà (taux d'emprunt).
alter table credits add column if not exists interest_rate_pct numeric not null default 0;

alter table credits enable row level security;

-- Mêmes règles de confidentialité que les abonnements :
-- partagé visible par tous ; perso visible par son owner (+ partenaire si partage).
drop policy if exists "credits_select" on credits;
drop policy if exists "credits_insert" on credits;
drop policy if exists "credits_update" on credits;
drop policy if exists "credits_delete" on credits;

create policy "credits_select" on credits for select
  using (household_id = auth_household_id()
         and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id)));
create policy "credits_insert" on credits for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "credits_update" on credits for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "credits_delete" on credits for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

-- Ajout à la publication Realtime, idempotent (ignore si déjà membre).
do $$
begin
  alter publication supabase_realtime add table credits;
exception
  when duplicate_object then null;
end $$;
