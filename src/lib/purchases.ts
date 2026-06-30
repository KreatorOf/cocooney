import { Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import { REVENUECAT_ANDROID_KEY, REVENUECAT_IOS_KEY, hasRevenueCat } from './env';

/** Identifiant de l'entitlement configuré dans RevenueCat. */
export const PREMIUM_ENTITLEMENT = 'premium';

// Import PARESSEUX : le module natif n'existe que dans un dev build avec le pod
// RevenueCat. On ne le charge donc que si une clé est configurée → l'app tourne
// sans crash sur un build qui n'a pas (encore) RevenueCat.
function rc() {
  return require('react-native-purchases').default as typeof import('react-native-purchases').default;
}

let configured = false;

/** Configure RevenueCat avec l'id Supabase comme appUserID (idempotent, no-op si pas de clé). */
export function configurePurchases(appUserID: string) {
  if (!hasRevenueCat || configured) return;
  const apiKey = Platform.select({
    ios: REVENUECAT_IOS_KEY,
    android: REVENUECAT_ANDROID_KEY,
    default: '',
  });
  if (!apiKey) return;
  rc().configure({ apiKey, appUserID });
  configured = true;
}

export function isEntitlementActive(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements.active[PREMIUM_ENTITLEMENT];
}

export async function getDefaultOffering(): Promise<PurchasesOffering | null> {
  if (!hasRevenueCat) return null;
  const offerings = await rc().getOfferings();
  return offerings.current ?? null;
}

export async function purchaseRcPackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await rc().purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return rc().restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!hasRevenueCat) return null;
  return rc().getCustomerInfo();
}

export function addCustomerInfoListener(cb: (info: CustomerInfo) => void): () => void {
  if (!hasRevenueCat) return () => {};
  const Purchases = rc();
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}
