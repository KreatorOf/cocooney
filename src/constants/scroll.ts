/**
 * Réglages communs des `ScrollView` : désactive l'effet de rebond (iOS) et le
 * halo d'overscroll (Android) pour un défilement net. À étaler sur les pages :
 * `<ScrollView {...noBounce} … />`.
 */
export const noBounce = {
  bounces: false,
  alwaysBounceVertical: false,
  overScrollMode: 'never',
} as const;
