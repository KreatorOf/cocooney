-- Premium (RevenueCat). Le foyer est Premium dès qu'UN membre l'est.
-- À exécuter dans Supabase → SQL Editor → Run. Idempotent.

alter table profiles add column if not exists is_premium boolean not null default false;

-- RLS inchangée : profiles_select (membres du foyer) laisse voir is_premium du partenaire ;
-- profiles_update (soi-même) autorise la mise à jour optimiste après achat.
-- Le webhook RevenueCat écrit via la clé service_role (Edge Function) et bypass la RLS.
