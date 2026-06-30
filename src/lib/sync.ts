/**
 * Moteur de synchronisation Supabase ⇄ store local.
 *
 * Stratégie « offline-first » simple :
 *  - écritures locales optimistes (le store met à jour l'UI immédiatement),
 *    puis poussées vers Supabase via le syncBridge ;
 *  - Realtime : tout changement (l'autre téléphone) déclenche un pull complet
 *    (volumes faibles pour un couple → simple et robuste).
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

import type {
  Account,
  Budget,
  Category,
  Member,
  Scope,
  SplitRule,
  Subscription,
  Transaction,
} from '@/domain/types';
import { setSyncHandlers } from '@/lib/syncBridge';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/store/useBudgetStore';

// ---- Mappers : lignes Postgres (snake_case) → domaine ----------------------

const toMember = (r: any): Member => ({
  id: r.id,
  name: r.display_name,
  emoji: r.emoji,
  monthlyIncomeCents: r.monthly_income_cents ?? undefined,
  isPremium: r.is_premium ?? false,
});

const toAccount = (r: any): Account => ({
  id: r.id,
  name: r.name,
  scope: r.scope as Scope,
  ownerId: r.owner_id ?? undefined,
  balanceCents: r.balance_cents,
  externalId: r.external_id ?? undefined,
});

const toCategory = (r: any): Category => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  scope: r.scope as Scope,
  ownerId: r.owner_id ?? undefined,
});

const toBudget = (r: any): Budget => ({
  id: r.id,
  categoryId: r.category_id,
  month: r.month,
  limitCents: r.limit_cents,
});

const toSubscription = (r: any): Subscription => ({
  id: r.id,
  name: r.name,
  amountCents: r.amount_cents,
  scope: r.scope as Scope,
  ownerId: r.owner_id ?? undefined,
  categoryId: r.category_id ?? undefined,
  icon: r.icon,
  color: r.color,
  dayOfMonth: r.day_of_month,
  active: r.active,
});

const toTransaction = (r: any): Transaction => ({
  id: r.id,
  amountCents: r.amount_cents,
  date: r.date,
  label: r.label,
  scope: r.scope as Scope,
  ownerId: r.owner_id,
  categoryId: r.category_id ?? '',
  accountId: r.account_id ?? undefined,
  splitRule: (r.split_rule as SplitRule) ?? undefined,
  isReconciled: r.is_reconciled,
  externalId: r.external_id ?? undefined,
});

// ---- Chargement complet ----------------------------------------------------

export async function pullAll(householdId: string, currentUserId: string) {
  if (!supabase) return;
  const [profiles, accounts, categories, budgets, transactions, subscriptions] = await Promise.all([
    supabase.from('profiles').select('*').eq('household_id', householdId),
    supabase.from('accounts').select('*').eq('household_id', householdId),
    supabase.from('categories').select('*').eq('household_id', householdId),
    supabase.from('budgets').select('*').eq('household_id', householdId),
    supabase.from('transactions').select('*').eq('household_id', householdId),
    supabase.from('subscriptions').select('*').eq('household_id', householdId),
  ]);

  useBudgetStore.getState().hydrateFromRemote({
    members: (profiles.data ?? []).map(toMember),
    accounts: (accounts.data ?? []).map(toAccount),
    categories: (categories.data ?? []).map(toCategory),
    budgets: (budgets.data ?? []).map(toBudget),
    transactions: (transactions.data ?? []).map(toTransaction),
    subscriptions: (subscriptions.data ?? []).map(toSubscription),
    currentUserId,
  });
}

// ---- Écritures (branchées sur le syncBridge) -------------------------------

export function registerWriters(householdId: string) {
  setSyncHandlers({
    onAddTransaction: (tx) => {
      void supabase?.from('transactions').upsert({
        id: tx.id,
        household_id: householdId,
        amount_cents: tx.amountCents,
        date: tx.date,
        label: tx.label,
        scope: tx.scope,
        owner_id: tx.ownerId,
        category_id: tx.categoryId || null,
        account_id: tx.accountId ?? null,
        split_rule: tx.splitRule ?? null,
        is_reconciled: tx.isReconciled,
        updated_at: new Date().toISOString(),
      });
    },
    onDeleteTransaction: (id) => {
      void supabase?.from('transactions').delete().eq('id', id);
    },
    onSetBudget: (b) => {
      void supabase?.from('budgets').upsert(
        {
          id: b.id,
          household_id: householdId,
          category_id: b.categoryId,
          month: b.month,
          limit_cents: b.limitCents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'category_id,month' },
      );
    },
    onUpdateAccountBalance: (accountId, balanceCents) => {
      void supabase
        ?.from('accounts')
        .update({ balance_cents: balanceCents, updated_at: new Date().toISOString() })
        .eq('id', accountId);
    },
    onUpdateIncome: (memberId, incomeCents) => {
      void supabase?.from('profiles').update({ monthly_income_cents: incomeCents }).eq('id', memberId);
    },
    onAddCategory: (c) => {
      void supabase?.from('categories').upsert(categoryRow(c, householdId));
    },
    onUpdateCategory: (c) => {
      void supabase?.from('categories').upsert(categoryRow(c, householdId));
    },
    onDeleteCategory: (id) => {
      void supabase?.from('categories').delete().eq('id', id);
    },
    onAddSubscription: (s) => {
      void supabase?.from('subscriptions').upsert(subscriptionRow(s, householdId));
    },
    onUpdateSubscription: (s) => {
      void supabase?.from('subscriptions').upsert(subscriptionRow(s, householdId));
    },
    onDeleteSubscription: (id) => {
      void supabase?.from('subscriptions').delete().eq('id', id);
    },
  });
}

function categoryRow(c: Category, householdId: string) {
  return {
    id: c.id,
    household_id: householdId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    scope: c.scope,
    owner_id: c.ownerId ?? null,
    updated_at: new Date().toISOString(),
  };
}

function subscriptionRow(s: Subscription, householdId: string) {
  return {
    id: s.id,
    household_id: householdId,
    name: s.name,
    amount_cents: s.amountCents,
    scope: s.scope,
    owner_id: s.ownerId ?? null,
    category_id: s.categoryId ?? null,
    icon: s.icon,
    color: s.color,
    day_of_month: s.dayOfMonth,
    active: s.active,
    updated_at: new Date().toISOString(),
  };
}

// ---- Realtime --------------------------------------------------------------

export function startRealtime(
  householdId: string,
  onRemoteChange: () => void,
): RealtimeChannel | null {
  if (!supabase) return null;
  const filter = `household_id=eq.${householdId}`;
  const channel = supabase.channel(`household:${householdId}`);

  for (const table of ['transactions', 'budgets', 'accounts', 'categories', 'profiles', 'subscriptions'] as const) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, onRemoteChange);
  }
  channel.subscribe();
  return channel;
}
