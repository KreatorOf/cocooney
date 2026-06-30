# Budget Couple — guide projet

App de gestion de budget **pour couples**, cross-platform iOS + Android, en **Expo (SDK 56) + expo-router + TypeScript**.

> Expo SDK 56 : consulter les docs versionnées https://docs.expo.dev/versions/v56.0.0/ avant d'écrire du code natif.

## Concept

Trois « poches » de budget :
- **Foyer** (partagé) : loyer, alimentation, énergie… avec une **règle de partage** par dépense (50/50, prorata des revenus, 100 % à un membre) → calcul d'un **solde inter-partenaires** (« qui doit combien à qui »).
- **Moi** (privé) : budget personnel, jamais exposé au partenaire.

Chaque transaction porte `scope` (`shared`/`personal`) + `ownerId` : c'est ce qui sépare le partagé du privé et prépare la future connexion bancaire.

## Architecture

- `src/domain/` — types et calculs purs (`selectors.ts` : dépenses, enveloppes, `resolvedShares`, `balanceBetween`). **Montants en centimes (entiers).**
- `src/store/useBudgetStore.ts` — état global Zustand persisté (AsyncStorage). Couche volontairement « source-agnostique » : un futur moteur de sync Supabase + agrégateur bancaire DSP2 alimentera ces mêmes actions.
- `src/store/seed.ts` — données de démo.
- `src/app/` — écrans expo-router : onglets `(tabs)/` = Foyer (`index`), Moi (`personal`), Réglages (`settings`) + modale `add-transaction`.
- `src/components/` — design system (Card, EnvelopeRow, ProgressBar, SegmentedControl, CategoryIcon, TransactionRow).
- `src/constants/theme.ts` — palette claire/sombre + tokens (`Spacing`, `Radius`).

## Backend Supabase (sync entre les deux téléphones)

- `supabase/schema.sql` — tables + RLS + RPC (`create_household`, `join_household`) + Realtime. À exécuter dans le SQL Editor.
- `src/lib/supabase.ts` — client (AsyncStorage, auto-refresh). `null` si pas de config → **mode démo local**.
- `src/lib/env.ts` — `hasSupabase` (présence des variables `EXPO_PUBLIC_SUPABASE_*`).
- `src/providers/AuthProvider.tsx` — session + Sign in with Apple (`expo-apple-authentication`) / Google (`@react-native-google-signin`, import paresseux) via `signInWithIdToken`.
- `src/providers/SyncProvider.tsx` + `src/lib/sync.ts` — offline-first : écritures optimistes (via `src/lib/syncBridge.ts`) poussées vers Supabase, Realtime → pull complet.
- `src/providers/AuthGate.tsx` — routage : `/sign-in` → `/setup-household` → onglets.
- Écrans : `src/app/sign-in.tsx`, `src/app/setup-household.tsx` (créer/rejoindre par code).
- Confidentialité : les transactions `personal` du partenaire ne quittent jamais le serveur (policy `tx_select`).

> ⚠️ La connexion Apple/Google native nécessite un **dev build** (`expo run:ios`), pas Expo Go. Variables dans `.env` (cf. `.env.example`).

## Onboarding & app vierge

- L'app **exige la connexion** (plus de mode démo : `seed.ts` supprimé, store initial vide).
- `create_household` crée un foyer **vierge** (compte joint + compte perso, **aucune catégorie**) ;
  migration `supabase/update_blank_onboarding.sql` (+ colonne `profiles.onboarding_completed`).
- **`src/app/onboarding.tsx`** : wizard 3 étapes (profil+revenu → enveloppes foyer → enveloppes
  perso) avec suggestions activables + catégories perso (`CustomCategorySheet`). `AuthGate` route
  vers `/onboarding` tant que `profile.onboarding_completed` est faux.
- **`src/app/edit-budgets.tsx`** (modale, ouverte depuis Réglages) : éditer revenu + enveloppes
  foyer/perso après coup (plafonds, ajout, suppression).
- Store : actions `setIncome`/`addCategory`/`updateCategory`/`deleteCategory` (+ `setBudgetLimit`),
  relayées à Supabase via `syncBridge` → `sync.ts`. Realtime écoute aussi `profiles` (revenu/nom).
- Composants réutilisables : `MoneyInput`, `EnvelopeEditorRow`, `IconPicker`, `ColorPicker`,
  `EmojiPicker`, `CustomCategorySheet`.

## Règles UI cross-platform (iOS + Android)

- Safe areas des **deux** côtés (`useSafeAreaInsets`) — Android est *edge-to-edge*.
- Tab bar (`(tabs)/_layout.tsx`) : hauteur = `58 + insets.bottom` (jamais codée en dur).
- Cibles tactiles ≥ 44/48 ; `KeyboardAvoidingView` sur tous les formulaires ; `Platform.select`
  pour les écarts.

## Tableau de bord « Vision » (V1) & Abonnements (V3)

- **Navigation par mois** : `store.selectedMonth` + `MonthSwitcher` (Foyer/Moi). Tous les calculs prennent `month`.
- **Foyer** : projection fin de mois (`projectedSpend`), top catégories (`topCategories`), carte abonnements, enveloppes tappables → `category/[id]`, « Voir tout » → `transactions`.
- **Moi** : carte santé revenu → dépenses (perso + part du foyer via `personalShareOfShared`) → épargne + taux.
- **Écrans** : `category/[id]` (détail enveloppe), `transactions` (recherche + filtre), `subscriptions` (total + échéances + « Payer » qui crée une transaction).
- **Abonnements** : table `subscriptions` (migration `supabase/update_subscriptions.sql`, RLS scope-aware + Realtime), store + sync + `SubscriptionSheet`. `selectors`: `subscriptionsTotal`, `upcomingSubscriptions`. `date`: `nextOccurrence`, `relativeDay`, `addMonths`.

## Monétisation — Premium « Foyer » (RevenueCat)

- Modèle : **1 abo couvre le foyer** (6,99 €/mois · 39,99 €/an · essai 7 j). `profiles.is_premium` par membre ; le foyer est Premium si **un** membre l'est (`members.some(m => m.isPremium)`, calculé client).
- `src/lib/purchases.ts` (RevenueCat, **import lazy** — chargé seulement si clé `EXPO_PUBLIC_REVENUECAT_IOS_KEY` présente) + `src/providers/PremiumProvider.tsx` (`usePremium()` → `isPremium`, `offering`, `purchase`, `restore`). Maj optimiste in-app + webhook fiable.
- `src/app/paywall.tsx` (modal). Gating : `MonthSwitcher` (mois passés = Premium), `subscriptions.tsx` (>3 = Premium), `settings.tsx` (carte statut).
- Backend : `update_premium.sql` (colonne) + Edge Function `supabase/functions/revenuecat-webhook/index.ts` (Deno, exclue du tsconfig app).

## Migrations SQL (ordre)

`schema.sql` est le miroir complet. Migrations incrémentales à exécuter :
`update_blank_onboarding.sql` → `update_privacy_sharing.sql` → `update_subscriptions.sql` → `update_premium.sql`.

## Prochaines étapes prévues

- V2 stats/graphes · V5 notifications · Connexion bancaire (open banking DSP2).

## Commandes

- `npm run ios` / `npm run android` / `npm run web`
- `npx tsc --noEmit` — vérif types
