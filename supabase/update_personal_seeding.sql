-- Mise à jour : ajoute un espace perso (compte + 3 catégories) à chaque membre.
-- À exécuter une fois dans Supabase → SQL Editor → Run. Idempotent.

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

  insert into categories (household_id, name, icon, color, scope, owner_id) values
    (p_household, 'Shopping', 'bag-handle',       '#FF7A45', 'personal', auth.uid()),
    (p_household, 'Santé',    'fitness',          '#14B8A6', 'personal', auth.uid()),
    (p_household, 'Loisirs',  'game-controller',  '#8B5CF6', 'personal', auth.uid());
end $$;

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

  insert into categories (household_id, name, icon, color, scope) values
    (h.id, 'Loyer',        'home',       '#6457F9', 'shared'),
    (h.id, 'Alimentation', 'restaurant', '#1FA463', 'shared'),
    (h.id, 'Énergie',      'flash',      '#EAB308', 'shared'),
    (h.id, 'Transport',    'car',        '#0EA5E9', 'shared'),
    (h.id, 'Sorties',      'wine',       '#EC4899', 'shared');

  insert into accounts (household_id, name, scope) values (h.id, 'Compte joint', 'shared');
  perform seed_personal_space(h.id);

  return h;
end $$;

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
  perform seed_personal_space(h.id);
  return h;
end $$;
