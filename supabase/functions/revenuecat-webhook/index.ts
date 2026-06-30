// Webhook RevenueCat → met à jour profiles.is_premium (source fiable).
// Déploiement : supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets requis (supabase secrets set ...) :
//   REVENUECAT_WEBHOOK_SECRET  (le même que dans RevenueCat → Webhooks → Authorization header)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (fournis automatiquement aux functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Événements RevenueCat qui rendent l'utilisateur Premium / le retirent.
const ACTIVE = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
]);
const INACTIVE = new Set(['EXPIRATION']);

Deno.serve(async (req) => {
  // Authentification du webhook (secret partagé).
  const auth = req.headers.get('Authorization');
  if (auth !== Deno.env.get('REVENUECAT_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const event = body?.event;
  const appUserId: string | undefined = event?.app_user_id;
  const type: string | undefined = event?.type;
  if (!appUserId || !type) return new Response('Bad request', { status: 400 });

  let isPremium: boolean | null = null;
  if (ACTIVE.has(type)) isPremium = true;
  else if (INACTIVE.has(type)) isPremium = false;
  // Autres types (CANCELLATION = auto-renew off mais accès maintenu, BILLING_ISSUE, TRANSFER…) : on n'agit pas.
  if (isPremium === null) return new Response('Ignored', { status: 200 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', appUserId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response('OK', { status: 200 });
});
