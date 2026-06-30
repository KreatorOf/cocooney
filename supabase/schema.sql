-- ============================================================================
-- Budget Couple — schéma Postgres + Row-Level Security
-- À exécuter dans Supabase : SQL Editor → coller → Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

-- Un profil par utilisateur authentifié. household_id = null tant qu'il n'a
-- ni créé ni rejoint un foyer.
create table if not exists profiles (
  id                   uuid primary key references auth.users on delete cascade,
  household_id         uuid references households on delete set null,
  display_name         text not null default 'Moi',
  emoji                text not null default '🙂',
  monthly_income_cents bigint,
  onboarding_completed boolean not null default false,
  share_personal       boolean not null default false,
  is_premium           boolean not null default false,
  created_at           timestamptz not null default now()
);

create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households on delete cascade,
  name          text not null,
  scope         text not null check (scope in ('shared','personal')),
  owner_id      uuid references profiles,
  balance_cents bigint not null default 0,
  external_id   text,
  updated_at    timestamptz not null default now()
);

create table if not exists categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  icon         text not null,
  color        text not null,
  scope        text not null check (scope in ('shared','personal')),
  owner_id     uuid references profiles,
  updated_at   timestamptz not null default now()
);

create table if not exists budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  category_id  uuid not null references categories on delete cascade,
  month        text not null,                 -- 'YYYY-MM'
  limit_cents  bigint not null default 0,
  updated_at   timestamptz not null default now(),
  unique (category_id, month)
);

create table if not exists transactions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households on delete cascade,
  amount_cents  bigint not null,              -- négatif = dépense
  date          timestamptz not null default now(),
  label         text not null,
  scope         text not null check (scope in ('shared','personal')),
  owner_id      uuid not null references profiles,
  category_id   uuid references categories on delete set null,
  account_id    uuid references accounts on delete set null,
  split_rule    jsonb,
  is_reconciled boolean not null default true,
  external_id   text,
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tx_household on transactions(household_id);
create index if not exists idx_tx_owner on transactions(owner_id);

create table if not exists subscriptions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households on delete cascade,
  name          text not null,
  amount_cents  bigint not null,
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

-- ----------------------------------------------------------------------------
-- Helper : household du user courant (security definer pour contourner la RLS
-- de profiles lors de l'évaluation des policies des autres tables).
-- ----------------------------------------------------------------------------
create or replace function auth_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid()
$$;

-- Le propriétaire `p_owner` partage-t-il son perso avec le foyer courant ?
create or replace function owner_shares_personal(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = p_owner
      and p.household_id = auth_household_id()
      and p.share_personal = true
  )
$$;

-- ----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, emoji)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'Moi'),
    '🙂'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Helper : espace perso (compte + catégories) pour le user courant
-- ----------------------------------------------------------------------------
create or replace function seed_personal_space(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Évite les doublons si le user a déjà un espace perso dans ce foyer.
  if exists (
    select 1 from accounts
    where household_id = p_household and scope = 'personal' and owner_id = auth.uid()
  ) then
    return;
  end if;

  -- Foyer vierge : seulement le compte perso. Les catégories viennent de l'onboarding.
  insert into accounts (household_id, name, scope, owner_id)
    values (p_household, 'Mon compte', 'personal', auth.uid());
end $$;

-- ----------------------------------------------------------------------------
-- RPC : créer un foyer (+ catégories par défaut) et y rattacher le user
-- ----------------------------------------------------------------------------
create or replace function create_household(p_name text)
returns households language plpgsql security definer set search_path = public as $$
declare
  h households;
  code text;
begin
  code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into households (name, invite_code) values (coalesce(nullif(p_name,''),'Notre foyer'), code)
  returning * into h;

  update profiles set household_id = h.id where id = auth.uid();

  -- Foyer vierge : compte joint + espace perso. Les catégories viennent de l'onboarding.
  insert into accounts (household_id, name, scope) values (h.id, 'Compte joint', 'shared');
  perform seed_personal_space(h.id);

  return h;
end $$;

-- ----------------------------------------------------------------------------
-- RPC : rejoindre un foyer via son code d'invitation
-- ----------------------------------------------------------------------------
create or replace function join_household(p_code text)
returns households language plpgsql security definer set search_path = public as $$
declare
  h households;
begin
  select * into h from households where invite_code = upper(trim(p_code));
  if h.id is null then
    raise exception 'Code d''invitation invalide';
  end if;
  update profiles set household_id = h.id where id = auth.uid();
  perform seed_personal_space(h.id);  -- espace perso du membre qui rejoint
  return h;
end $$;

-- ----------------------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------------------
alter table households   enable row level security;
alter table profiles     enable row level security;
alter table accounts     enable row level security;
alter table categories   enable row level security;
alter table budgets      enable row level security;
alter table transactions enable row level security;
alter table subscriptions enable row level security;

-- profiles : je vois mon profil + ceux de mon foyer ; je modifie le mien.
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or household_id = auth_household_id());
create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- households : les membres voient leur foyer.
create policy "households_select" on households for select
  using (id = auth_household_id());

-- Comptes & catégories : partagé visible par tous ; perso visible par son owner,
-- + par le partenaire SI l'owner a activé `share_personal` (lecture seule).
create policy "accounts_select" on accounts for select
  using (household_id = auth_household_id()
         and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id)));
create policy "accounts_insert" on accounts for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "accounts_update" on accounts for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "accounts_delete" on accounts for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

create policy "categories_select" on categories for select
  using (household_id = auth_household_id()
         and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id)));
create policy "categories_insert" on categories for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "categories_update" on categories for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "categories_delete" on categories for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

-- Budgets : visibles si leur catégorie l'est (hérite du partage) ;
-- modifiables seulement pour une catégorie qu'on peut éditer.
create policy "budgets_select" on budgets for select
  using (household_id = auth_household_id()
         and exists (select 1 from categories c where c.id = budgets.category_id));
create policy "budgets_insert" on budgets for insert
  with check (
    household_id = auth_household_id()
    and exists (select 1 from categories c
                where c.id = budgets.category_id and (c.scope = 'shared' or c.owner_id = auth.uid())));
create policy "budgets_update" on budgets for update
  using (
    household_id = auth_household_id()
    and exists (select 1 from categories c
                where c.id = budgets.category_id and (c.scope = 'shared' or c.owner_id = auth.uid())));
create policy "budgets_delete" on budgets for delete
  using (
    household_id = auth_household_id()
    and exists (select 1 from categories c
                where c.id = budgets.category_id and (c.scope = 'shared' or c.owner_id = auth.uid())));

-- transactions : on LIT le partagé du foyer + son propre privé ;
-- on n'écrit/modifie/supprime que ses propres transactions.
create policy "tx_select" on transactions for select
  using (
    household_id = auth_household_id()
    and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id))
  );
create policy "tx_insert" on transactions for insert
  with check (household_id = auth_household_id() and owner_id = auth.uid());
create policy "tx_update" on transactions for update
  using (household_id = auth_household_id() and owner_id = auth.uid());
create policy "tx_delete" on transactions for delete
  using (household_id = auth_household_id() and owner_id = auth.uid());

-- Abonnements : partagé visible par tous ; perso privé (sauf partage).
create policy "subscriptions_select" on subscriptions for select
  using (household_id = auth_household_id()
         and (scope = 'shared' or owner_id = auth.uid() or owner_shares_personal(owner_id)));
create policy "subscriptions_insert" on subscriptions for insert
  with check (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "subscriptions_update" on subscriptions for update
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));
create policy "subscriptions_delete" on subscriptions for delete
  using (household_id = auth_household_id() and (scope = 'shared' or owner_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- Realtime : diffuser les changements aux deux téléphones
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table accounts;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table subscriptions;
