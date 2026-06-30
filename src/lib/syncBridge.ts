/**
 * Pont entre le store (qui ne connaît pas Supabase) et le moteur de sync.
 * En mode démo local, les handlers sont des no-op.
 * Quand on est connecté, `SyncProvider` les remplace par des écritures Supabase.
 */

import type { Budget, Category, Subscription, Transaction } from '@/domain/types';

interface SyncHandlers {
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSetBudget: (budget: Budget) => void;
  onUpdateAccountBalance: (accountId: string, balanceCents: number) => void;
  onUpdateIncome: (memberId: string, incomeCents: number) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onAddSubscription: (subscription: Subscription) => void;
  onUpdateSubscription: (subscription: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
}

const noop = () => {};

export const syncBridge: SyncHandlers = {
  onAddTransaction: noop,
  onDeleteTransaction: noop,
  onSetBudget: noop,
  onUpdateAccountBalance: noop,
  onUpdateIncome: noop,
  onAddCategory: noop,
  onUpdateCategory: noop,
  onDeleteCategory: noop,
  onAddSubscription: noop,
  onUpdateSubscription: noop,
  onDeleteSubscription: noop,
};

export function setSyncHandlers(handlers: Partial<SyncHandlers>) {
  Object.assign(syncBridge, handlers);
}

export function resetSyncHandlers() {
  syncBridge.onAddTransaction = noop;
  syncBridge.onDeleteTransaction = noop;
  syncBridge.onSetBudget = noop;
  syncBridge.onUpdateAccountBalance = noop;
  syncBridge.onUpdateIncome = noop;
  syncBridge.onAddCategory = noop;
  syncBridge.onUpdateCategory = noop;
  syncBridge.onDeleteCategory = noop;
  syncBridge.onAddSubscription = noop;
  syncBridge.onUpdateSubscription = noop;
  syncBridge.onDeleteSubscription = noop;
}
