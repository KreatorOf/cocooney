/**
 * État global de l'app (Zustand) persisté localement via AsyncStorage.
 *
 * Source-agnostique : les écritures locales (optimistes) sont relayées vers
 * Supabase par le `syncBridge`. L'état initial est VIDE — il est rempli par
 * `hydrateFromRemote` après connexion (l'app exige désormais un compte).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  Account,
  Budget,
  Category,
  Credit,
  Member,
  Scope,
  SplitRule,
  Subscription,
  Transaction,
} from '@/domain/types';
import { syncBridge } from '@/lib/syncBridge';
import { addMonths, monthKey } from '@/utils/date';

export interface NewTransactionInput {
  amountCents: number;
  label: string;
  scope: Scope;
  ownerId: string;
  categoryId: string;
  accountId?: string;
  splitRule?: SplitRule;
  date?: string;
}

export interface NewCategoryInput {
  name: string;
  icon: string;
  color: string;
  scope: Scope;
  ownerId?: string;
}

export interface NewSubscriptionInput {
  name: string;
  amountCents: number;
  scope: Scope;
  ownerId?: string;
  categoryId?: string;
  icon: string;
  color: string;
  dayOfMonth: number;
}

export interface NewCreditInput {
  name: string;
  totalAmountCents: number;
  paidAmountCents: number;
  monthlyPaymentCents: number;
  dayOfMonth: number;
  endDate: string;
  icon: string;
  color: string;
  categoryId?: string;
  scope: Scope;
}

/** Données complètes provenant du serveur, pour remplacer le cache local. */
export interface RemoteSnapshot {
  members: Member[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  credits: Credit[];
  currentUserId: string;
}

interface BudgetState {
  members: Member[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  credits: Credit[];
  /** Membre représentant l'utilisateur de cet appareil. */
  currentUserId: string;
  /** Mois réel (aujourd'hui). */
  currentMonth: string;
  /** Mois consulté dans l'UI (peut être un mois passé). */
  selectedMonth: string;

  setSelectedMonth: (month: string) => void;
  /** Décale le mois consulté ; ne dépasse pas le mois courant. */
  shiftMonth: (delta: number) => void;
  addTransaction: (input: NewTransactionInput) => void;
  deleteTransaction: (id: string) => void;
  setBudgetLimit: (categoryId: string, limitCents: number) => void;
  setIncome: (memberId: string, incomeCents: number) => void;
  addCategory: (input: NewCategoryInput) => Category;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  addSubscription: (input: NewSubscriptionInput) => Subscription;
  updateSubscription: (subscription: Subscription) => void;
  deleteSubscription: (id: string) => void;
  addCredit: (input: NewCreditInput) => Credit;
  updateCredit: (credit: Credit) => void;
  deleteCredit: (id: string) => void;
  /** Paie une mensualité : incrémente le payé + crée une dépense foyer. */
  payCreditInstallment: (id: string) => void;
  /** Remplace le cache local avec un instantané serveur (sync). */
  hydrateFromRemote: (snapshot: RemoteSnapshot) => void;
}

/** UUID v4 — requis pour les clés primaires Postgres (généré côté client). */
function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      members: [],
      categories: [],
      accounts: [],
      budgets: [],
      transactions: [],
      subscriptions: [],
      credits: [],
      currentUserId: '',
      currentMonth: monthKey(),
      selectedMonth: monthKey(),

      setSelectedMonth: (month) => set({ selectedMonth: month }),
      shiftMonth: (delta) =>
        set((state) => {
          const next = addMonths(state.selectedMonth, delta);
          return { selectedMonth: next > state.currentMonth ? state.currentMonth : next };
        }),

      addTransaction: (input) => {
        const tx: Transaction = {
          id: uid(),
          amountCents: input.amountCents,
          date: input.date ?? new Date().toISOString(),
          label: input.label.trim() || 'Dépense',
          scope: input.scope,
          ownerId: input.ownerId,
          categoryId: input.categoryId,
          accountId: input.accountId,
          splitRule: input.scope === 'shared' ? input.splitRule : undefined,
          isReconciled: true,
        };
        let newBalance: number | null = null;
        set((state) => {
          const accounts = state.accounts.map((a) => {
            if (a.id !== input.accountId) return a;
            newBalance = a.balanceCents + input.amountCents;
            return { ...a, balanceCents: newBalance };
          });
          return { transactions: [tx, ...state.transactions], accounts };
        });
        syncBridge.onAddTransaction(tx);
        if (input.accountId && newBalance !== null)
          syncBridge.onUpdateAccountBalance(input.accountId, newBalance);
      },

      deleteTransaction: (id) => {
        let accountId: string | undefined;
        let newBalance: number | null = null;
        set((state) => {
          const tx = state.transactions.find((t) => t.id === id);
          let accounts = state.accounts;
          if (tx?.accountId) {
            accountId = tx.accountId;
            accounts = state.accounts.map((a) => {
              if (a.id !== tx.accountId) return a;
              newBalance = a.balanceCents - tx.amountCents;
              return { ...a, balanceCents: newBalance };
            });
          }
          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            accounts,
          };
        });
        syncBridge.onDeleteTransaction(id);
        if (accountId && newBalance !== null)
          syncBridge.onUpdateAccountBalance(accountId, newBalance);
      },

      setBudgetLimit: (categoryId, limitCents) => {
        let budget: Budget | null = null;
        set((state) => {
          const month = state.currentMonth;
          const existing = state.budgets.find(
            (b) => b.categoryId === categoryId && b.month === month,
          );
          if (existing) {
            budget = { ...existing, limitCents };
            return {
              budgets: state.budgets.map((b) => (b.id === existing.id ? budget! : b)),
            };
          }
          budget = { id: uid(), categoryId, month, limitCents };
          return { budgets: [...state.budgets, budget] };
        });
        if (budget) syncBridge.onSetBudget(budget);
      },

      setIncome: (memberId, incomeCents) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, monthlyIncomeCents: incomeCents } : m,
          ),
        }));
        syncBridge.onUpdateIncome(memberId, incomeCents);
      },

      addCategory: (input) => {
        const cat: Category = {
          id: uid(),
          name: input.name.trim() || 'Catégorie',
          icon: input.icon,
          color: input.color,
          scope: input.scope,
          ownerId: input.ownerId,
        };
        set((state) => ({ categories: [...state.categories, cat] }));
        syncBridge.onAddCategory(cat);
        return cat;
      },

      updateCategory: (category) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === category.id ? category : c)),
        }));
        syncBridge.onUpdateCategory(category);
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          budgets: state.budgets.filter((b) => b.categoryId !== id),
        }));
        syncBridge.onDeleteCategory(id);
      },

      addSubscription: (input) => {
        const sub: Subscription = {
          id: uid(),
          name: input.name.trim() || 'Abonnement',
          amountCents: Math.abs(input.amountCents),
          scope: input.scope,
          ownerId: input.scope === 'personal' ? input.ownerId : undefined,
          categoryId: input.categoryId,
          icon: input.icon,
          color: input.color,
          dayOfMonth: Math.min(31, Math.max(1, input.dayOfMonth)),
          active: true,
        };
        set((state) => ({ subscriptions: [...state.subscriptions, sub] }));
        syncBridge.onAddSubscription(sub);
        return sub;
      },

      updateSubscription: (subscription) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === subscription.id ? subscription : s,
          ),
        }));
        syncBridge.onUpdateSubscription(subscription);
      },

      deleteSubscription: (id) => {
        set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) }));
        syncBridge.onDeleteSubscription(id);
      },

      addCredit: (input) => {
        const credit: Credit = {
          id: uid(),
          name: input.name.trim() || 'Crédit',
          totalAmountCents: Math.abs(input.totalAmountCents),
          paidAmountCents: Math.max(0, Math.abs(input.paidAmountCents)),
          monthlyPaymentCents: Math.abs(input.monthlyPaymentCents),
          dayOfMonth: Math.min(31, Math.max(1, input.dayOfMonth)),
          endDate: input.endDate,
          icon: input.icon,
          color: input.color,
          categoryId: input.categoryId,
          scope: input.scope,
          active: true,
        };
        set((state) => ({ credits: [...state.credits, credit] }));
        syncBridge.onAddCredit(credit);
        return credit;
      },

      updateCredit: (credit) => {
        set((state) => ({
          credits: state.credits.map((c) => (c.id === credit.id ? credit : c)),
        }));
        syncBridge.onUpdateCredit(credit);
      },

      deleteCredit: (id) => {
        set((state) => ({ credits: state.credits.filter((c) => c.id !== id) }));
        syncBridge.onDeleteCredit(id);
      },

      payCreditInstallment: (id) => {
        const credit = useBudgetStore.getState().credits.find((c) => c.id === id);
        if (!credit) return;
        const updated: Credit = {
          ...credit,
          paidAmountCents: Math.min(
            credit.totalAmountCents,
            credit.paidAmountCents + credit.monthlyPaymentCents,
          ),
        };
        useBudgetStore.getState().updateCredit(updated);
        // Trace la mensualité comme une dépense foyer.
        useBudgetStore.getState().addTransaction({
          amountCents: -credit.monthlyPaymentCents,
          label: credit.name,
          scope: 'shared',
          ownerId: useBudgetStore.getState().currentUserId,
          categoryId: credit.categoryId ?? '',
          splitRule: { kind: 'fiftyFifty' },
        });
      },

      hydrateFromRemote: (snapshot) =>
        set({
          members: snapshot.members,
          categories: snapshot.categories,
          accounts: snapshot.accounts,
          budgets: snapshot.budgets,
          transactions: snapshot.transactions,
          subscriptions: snapshot.subscriptions,
          credits: snapshot.credits,
          currentUserId: snapshot.currentUserId,
          currentMonth: monthKey(),
        }),
    }),
    {
      name: 'budget-store-v3',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
