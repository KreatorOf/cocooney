-- Migration : foyer VIERGE + suivi d'onboarding.
-- À exécuter une fois dans Supabase → SQL Editor → Run. Idempotent.

-- 1) Drapeau d'onboarding par utilisateur
alter table profiles add column if not exists onboarding_completed boolean not null default false;

-- 2) Espace perso : seulement le compte « Mon compte » (plus de catégories pré-remplies)
create or replace function seed_personal_space(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from accounts
    where household_id = p_household and scope = 'personal' and owner_id = auth.uid()
  ) then
    return;
  end if;

  insert into accounts (household_id, name, scope, owner_id)
    values (p_household, 'Mon compte', 'personal', auth.uid());
end $$;

-- 3) Création de foyer VIERGE : juste le compte joint + l'espace perso du créateur.
--    Les catégories/enveloppes viennent désormais de l'onboarding.
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

  insert into accounts (household_id, name, scope) values (h.id, 'Compte joint', 'shared');
  perform seed_personal_space(h.id);

  return h;
end $$;
