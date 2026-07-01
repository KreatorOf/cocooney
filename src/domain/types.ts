/**
 * Modèle de données. Tous les montants sont en CENTIMES (entiers)
 * pour éviter les imprécisions des nombres à virgule flottante.
 *
 * Pensé pour accueillir plus tard une connexion bancaire DSP2 :
 * `externalId` permettra de rattacher une transaction agrégée,
 * et `isReconciled` distingue les mouvements importés à trier.
 */

export type Scope = 'shared' | 'personal';
export type MemberId = string;

export interface Member {
  id: MemberId;
  name: string;
  emoji: string;
  /** Revenu mensuel net, sert au partage « au prorata des revenus ». */
  monthlyIncomeCents?: number;
  /** Abonnement Premium actif (RevenueCat). Le foyer est Premium si un membre l'est. */
  isPremium?: boolean;
}

export interface Category {
  id: string;
  name: string;
  /** Nom d'icône Ionicons. */
  icon: string;
  color: string;
  scope: Scope;
  /** null/undefined pour une catégorie partagée ; sinon le membre propriétaire. */
  ownerId?: MemberId;
}

export interface Account {
  id: string;
  name: string;
  scope: Scope;
  ownerId?: MemberId;
  balanceCents: number;
  externalId?: string;
}

/** Règle de répartition d'une dépense FOYER entre les partenaires. */
export type SplitRule =
  | { kind: 'fiftyFifty' }
  | { kind: 'proRataIncome' }
  | { kind: 'fixed'; shares: Record<MemberId, number> } // centimes par membre
  | { kind: 'fullyOwned'; memberId: MemberId };

export interface Budget {
  id: string;
  categoryId: string;
  /** Mois au format 'YYYY-MM'. */
  month: string;
  limitCents: number;
}

/** Dépense récurrente mensuelle (abonnement, loyer…). */
export interface Subscription {
  id: string;
  name: string;
  /** Montant positif (la charge mensuelle). */
  amountCents: number;
  scope: Scope;
  ownerId?: string;
  categoryId?: string;
  icon: string;
  color: string;
  /** Jour du mois de prélèvement (1–31, écrêté pour les mois courts). */
  dayOfMonth: number;
  active: boolean;
}

/** Crédit / prêt du foyer, remboursé par mensualités. */
export interface Credit {
  id: string;
  name: string;
  /** Montant total emprunté (positif, centimes). */
  totalAmountCents: number;
  /** Somme déjà remboursée (positif, centimes). Le restant est calculé. */
  paidAmountCents: number;
  /** Mensualité (positif, centimes). */
  monthlyPaymentCents: number;
  /** Jour du mois de prélèvement (1–31, écrêté pour les mois courts). */
  dayOfMonth: number;
  /** Taux d'emprunt annuel (%, ex. 3.5). 0 = sans intérêts. */
  interestRatePct: number;
  /** Échéance (dernier prélèvement), date ISO 'YYYY-MM-DD'. */
  endDate: string;
  icon: string;
  color: string;
  /** Catégorie rattachée (pour la dépense créée au « Payer »). */
  categoryId?: string;
  scope: Scope;
  active: boolean;
}

export interface Transaction {
  id: string;
  /** Négatif = dépense, positif = revenu. En centimes. */
  amountCents: number;
  /** Date ISO. */
  date: string;
  label: string;
  scope: Scope;
  /** Qui a payé / à qui appartient la transaction. */
  ownerId: MemberId;
  categoryId: string;
  accountId?: string;
  /** Présent uniquement si scope === 'shared'. */
  splitRule?: SplitRule;
  /** false = importé de la banque, en attente de catégorisation. */
  isReconciled: boolean;
  externalId?: string;
}
