/** Calculs dérivés du modèle : dépenses, enveloppes et solde du couple. */

import { monthKey, nextOccurrence } from '@/utils/date';
import type { Budget, Category, Credit, Member, Subscription, Transaction } from './types';

/** Total dépensé (valeur absolue) dans une catégorie sur un mois donné. */
export function spentInCategory(
  txs: Transaction[],
  categoryId: string,
  month: string,
): number {
  return txs
    .filter(
      (t) =>
        t.categoryId === categoryId &&
        t.amountCents < 0 &&
        monthKey(t.date) === month,
    )
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
}

/** Total dépensé sur l'ensemble des catégories d'un scope pour un mois. */
export function spentForScope(
  txs: Transaction[],
  categories: Category[],
  scope: 'shared' | 'personal',
  month: string,
  ownerId?: string,
): number {
  const ids = new Set(
    categories
      .filter((c) => c.scope === scope && (!ownerId || c.ownerId === ownerId))
      .map((c) => c.id),
  );
  return txs
    .filter(
      (t) =>
        ids.has(t.categoryId) &&
        t.amountCents < 0 &&
        monthKey(t.date) === month,
    )
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
}

/** Somme des limites des enveloppes d'un mois pour un ensemble de catégories. */
export function totalBudget(
  budgets: Budget[],
  categories: Category[],
  scope: 'shared' | 'personal',
  month: string,
  ownerId?: string,
): number {
  const ids = new Set(
    categories
      .filter((c) => c.scope === scope && (!ownerId || c.ownerId === ownerId))
      .map((c) => c.id),
  );
  return budgets
    .filter((b) => b.month === month && ids.has(b.categoryId))
    .reduce((sum, b) => sum + b.limitCents, 0);
}

/**
 * Répartit le montant d'une dépense FOYER entre les membres selon sa règle.
 * Retourne la part DUE par chaque membre (en centimes positifs).
 */
export function resolvedShares(
  tx: Transaction,
  members: Member[],
): Record<string, number> {
  const total = Math.abs(tx.amountCents);
  const rule = tx.splitRule ?? { kind: 'fiftyFifty' as const };
  const shares: Record<string, number> = {};

  switch (rule.kind) {
    case 'fullyOwned':
      for (const m of members) shares[m.id] = m.id === rule.memberId ? total : 0;
      return shares;

    case 'fixed':
      for (const m of members) shares[m.id] = rule.shares[m.id] ?? 0;
      return shares;

    case 'proRataIncome': {
      const incomes = members.map((m) => m.monthlyIncomeCents ?? 0);
      const sum = incomes.reduce((a, b) => a + b, 0);
      if (sum === 0) return splitEvenly(total, members);
      let allocated = 0;
      members.forEach((m, i) => {
        const part =
          i === members.length - 1
            ? total - allocated // le dernier absorbe l'arrondi
            : Math.round((total * incomes[i]) / sum);
        shares[m.id] = part;
        allocated += part;
      });
      return shares;
    }

    case 'fiftyFifty':
    default:
      return splitEvenly(total, members);
  }
}

function splitEvenly(total: number, members: Member[]): Record<string, number> {
  const shares: Record<string, number> = {};
  const base = Math.floor(total / members.length);
  let remainder = total - base * members.length;
  for (const m of members) {
    shares[m.id] = base + (remainder > 0 ? 1 : 0); // distribue le reste au centime
    if (remainder > 0) remainder -= 1;
  }
  return shares;
}

/**
 * Solde du couple sur les dépenses FOYER d'un mois.
 * Résultat > 0 : `b` doit ce montant à `a`. < 0 : `a` doit à `b`.
 */
export function balanceBetween(
  a: Member,
  b: Member,
  txs: Transaction[],
  members: Member[],
  month: string,
): number {
  let net = 0; // ce que A a avancé pour B, net
  for (const tx of txs) {
    if (tx.scope !== 'shared' || tx.amountCents >= 0) continue;
    if (monthKey(tx.date) !== month) continue;
    const shares = resolvedShares(tx, members);
    const paidByA = tx.ownerId === a.id ? Math.abs(tx.amountCents) : 0;
    net += paidByA - (shares[a.id] ?? 0);
  }
  return net;
}

/**
 * Part DUE par un membre sur l'ensemble des dépenses FOYER d'un mois
 * (selon la règle de partage de chaque transaction). Sert au calcul perso.
 */
export function personalShareOfShared(
  memberId: string,
  txs: Transaction[],
  members: Member[],
  month: string,
): number {
  let sum = 0;
  for (const tx of txs) {
    if (tx.scope !== 'shared' || tx.amountCents >= 0) continue;
    if (monthKey(tx.date) !== month) continue;
    sum += resolvedShares(tx, members)[memberId] ?? 0;
  }
  return sum;
}

/** Top N catégories par montant dépensé (décroissant), pour un scope/mois. */
export function topCategories(
  txs: Transaction[],
  categories: Category[],
  scope: 'shared' | 'personal',
  month: string,
  n: number,
  ownerId?: string,
): { category: Category; spentCents: number }[] {
  return categories
    .filter((c) => c.scope === scope && (!ownerId || c.ownerId === ownerId))
    .map((c) => ({ category: c, spentCents: spentInCategory(txs, c.id, month) }))
    .filter((x) => x.spentCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents)
    .slice(0, n);
}

/** Projection linéaire de la dépense en fin de mois selon le rythme actuel. */
export function projectedSpend(spentCents: number, now: Date = new Date()): number {
  const elapsed = Math.max(1, now.getDate());
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.round((spentCents / elapsed) * total);
}

/** Total mensuel des abonnements actifs (visibles). */
export function subscriptionsTotal(subs: Subscription[]): number {
  return subs.filter((s) => s.active).reduce((sum, s) => sum + s.amountCents, 0);
}

/** Abonnements actifs triés par prochaine échéance. */
export function upcomingSubscriptions(
  subs: Subscription[],
  now: Date = new Date(),
): { sub: Subscription; nextDate: Date }[] {
  return subs
    .filter((s) => s.active)
    .map((s) => ({ sub: s, nextDate: nextOccurrence(s.dayOfMonth, now) }))
    .sort((a, b) => +a.nextDate - +b.nextDate);
}

// ---- Crédits ---------------------------------------------------------------

/**
 * Intérêts totaux estimés (« coût du crédit ») : ce que le taux fait payer en
 * plus du capital emprunté. Calcul par amortissement à partir du capital, du
 * taux annuel et de la mensualité. Retourne 0 si non calculable.
 */
export function creditInterestCents(c: Credit): number {
  const P = c.totalAmountCents;
  const M = c.monthlyPaymentCents;
  const rate = c.interestRatePct ?? 0;
  if (P <= 0 || M <= 0 || rate <= 0) return 0;
  const i = rate / 100 / 12; // taux mensuel
  if (M <= P * i) return 0; // mensualité insuffisante → non calculable
  const n = Math.log(M / (M - P * i)) / Math.log(1 + i); // nombre de mensualités
  return Math.max(0, Math.round(M * n - P));
}

/** Coût total à rembourser = capital + intérêts. */
export function creditTotalCost(c: Credit): number {
  return c.totalAmountCents + creditInterestCents(c);
}

/** Restant dû sur un crédit, intérêts inclus (jamais négatif). */
export function creditRemaining(c: Credit): number {
  return Math.max(0, creditTotalCost(c) - c.paidAmountCents);
}

/** Progression du remboursement (0 → 1), sur le coût total. */
export function creditProgress(c: Credit): number {
  const cost = creditTotalCost(c);
  return cost > 0 ? Math.min(1, c.paidAmountCents / cost) : 0;
}

/** Pourcentage remboursé, entier 0–100. */
export function creditRepaidPct(c: Credit): number {
  return Math.round(creditProgress(c) * 100);
}

/** Un crédit est soldé si tout est payé ou l'échéance est passée. */
export function isCreditDone(c: Credit, now: Date = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return creditRemaining(c) <= 0 || (!!c.endDate && c.endDate < today);
}

/** Total des mensualités des crédits actifs non soldés. */
export function creditsMonthlyTotal(credits: Credit[]): number {
  return credits
    .filter((c) => c.active && !isCreditDone(c))
    .reduce((sum, c) => sum + c.monthlyPaymentCents, 0);
}

/** Total restant dû sur l'ensemble des crédits actifs. */
export function creditsRemainingTotal(credits: Credit[]): number {
  return credits.filter((c) => c.active).reduce((sum, c) => sum + creditRemaining(c), 0);
}

/** Crédits actifs non soldés triés par prochaine échéance de prélèvement. */
export function upcomingCredits(
  credits: Credit[],
  now: Date = new Date(),
): { credit: Credit; nextDate: Date }[] {
  return credits
    .filter((c) => c.active && !isCreditDone(c, now))
    .map((c) => ({ credit: c, nextDate: nextOccurrence(c.dayOfMonth, now) }))
    .sort((a, b) => +a.nextDate - +b.nextDate);
}
