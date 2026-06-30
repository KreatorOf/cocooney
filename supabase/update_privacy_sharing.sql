-- Confidentialité du perso + PARTAGE OPT-IN.
-- Par défaut : le perso (catégories/comptes/budgets/transactions) d'un membre
-- est invisible à l'autre. Si un membre active `share_personal`, son perso
-- devient visible (en lecture seule) à son partenaire.
-- À exécuter dans Supabase → SQL Editor → Run. Idempotent.

-- 1) Drapeau de partage par utilisateur
alter table profiles add column if not exists share_personal boolean not null default false;

-- Helper : le propriétaire `p_owner` partage-t-il son perso avec le foyer courant ?
create or replace function owner_shares_personal(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = p_owner
      and p.household_id = auth_household_id()
      and p.share_personal = true
  )
$$;

-- 2) Catégories
drop policy if exists "categories_all" on categories;
drop policy if exists "categories_select" on categories;
drop policy if exists "categories_insert" on categories;
drop policy if exists "categories_update" on categories;
drop policy if exists "categories_delete" on categories;

create policy "categories_select" on categories for select
  using (
    household_id = auth_household_id()
    and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id))
  );
create policy "categories_insert" on categories for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "categories_update" on categories for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "categories_delete" on categories for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

-- 3) Comptes
drop policy if exists "accounts_all" on accounts;
drop policy if exists "accounts_select" on accounts;
drop policy if exists "accounts_insert" on accounts;
drop policy if exists "accounts_update" on accounts;
drop policy if exists "accounts_delete" on accounts;

create policy "accounts_select" on accounts for select
  using (
    household_id = auth_household_id()
    and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id))
  );
create policy "accounts_insert" on accounts for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "accounts_update" on accounts for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "accounts_delete" on accounts for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

-- 4) Budgets : visibles si leur catégorie l'est (hérite du partage) ;
--    modifiables seulement pour une catégorie qu'on peut éditer.
drop policy if exists "budgets_all" on budgets;
drop policy if exists "budgets_select" on budgets;
drop policy if exists "budgets_insert" on budgets;
drop policy if exists "budgets_update" on budgets;
drop policy if exists "budgets_delete" on budgets;

create policy "budgets_select" on budgets for select
  using (
    household_id = auth_household_id()
    and exists (select 1 from categories c where c.id = budgets.category_id)
  );
create policy "budgets_insert" on budgets for insert
  with check (
    household_id = auth_household_id()
    and exists (select 1 from categories c
                where c.id = budgets.category_id and (c.scope = 'shared' or c.owner_id = auth.uid()))
  );
create policy "budgets_update" on budgets for update
  using (
    household_id = auth_household_id()
    and exists (select 1 from categories c
                where c.id = budgets.category_id and (c.scope = 'shared' or c.owner_id = auth.uid()))
  );
create policy "budgets_delete" on budgets for delete
  using (
    household_id = auth_household_id()
    and exists (select 1 from categories c
                where c.id = budgets.category_id and (c.scope = 'shared' or c.owner_id = auth.uid()))
  );

-- 5) Transactions : on lit le partagé + son perso + le perso d'un membre qui partage ;
--    on n'écrit/modifie/supprime que ses propres transactions.
drop policy if exists "tx_select" on transactions;
create policy "tx_select" on transactions for select
  using (
    household_id = auth_household_id()
    and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id))
  );
