import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { hasRevenueCat } from '@/lib/env';
import {
  addCustomerInfoListener,
  configurePurchases,
  getCustomerInfo,
  getDefaultOffering,
  isEntitlementActive,
  purchaseRcPackage,
  restorePurchases,
} from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useBudgetStore } from '@/store/useBudgetStore';

interface PremiumValue {
  /** true si le FOYER est Premium (un membre abonné suffit). */
  isPremium: boolean;
  offering: PurchasesOffering | null;
  /** Lance l'achat d'un package RevenueCat. Throw si annulé/erreur. */
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  /** Restaure les achats ; retourne true si Premium retrouvé. */
  restore: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const members = useBudgetStore((s) => s.members);
  const [localActive, setLocalActive] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  // Débloque tout de suite + persiste (le partenaire le voit via Realtime profiles).
  const markPremium = async () => {
    setLocalActive(true);
    if (supabase && session && !profile?.is_premium) {
      await supabase.from('profiles').update({ is_premium: true }).eq('id', session.user.id);
    }
  };

  useEffect(() => {
    if (!hasRevenueCat || !session) return;
    configurePurchases(session.user.id);
    let unsub = () => {};
    void (async () => {
      try {
        const info = await getCustomerInfo();
        if (isEntitlementActive(info)) await markPremium();
        setOffering(await getDefaultOffering());
        unsub = addCustomerInfoListener((i) => {
          if (isEntitlementActive(i)) void markPremium();
          else setLocalActive(false);
        });
      } catch {
        // RevenueCat indisponible (ex. simulateur sans dev build) : on ignore.
      }
    })();
    return () => unsub();
  }, [session?.user.id]);

  const isPremium = members.some((m) => m.isPremium) || !!profile?.is_premium || localActive;

  const purchase = async (pkg: PurchasesPackage) => {
    const info = await purchaseRcPackage(pkg);
    if (isEntitlementActive(info)) await markPremium();
  };

  const restore = async () => {
    const info = await restorePurchases();
    const ok = isEntitlementActive(info);
    if (ok) await markPremium();
    return ok;
  };

  const value = useMemo<PremiumValue>(
    () => ({ isPremium, offering, purchase, restore }),
    [isPremium, offering],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium doit être utilisé dans PremiumProvider');
  return ctx;
}
