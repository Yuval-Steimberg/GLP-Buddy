// Supabase Edge Function (Deno) — create a Stripe Checkout Session for the
// GLPenPal Premium subscription and return its URL.
//
// IMPORTANT — App Store / Play compliance:
//   This is for the WEB PWA only. Apple and Google require their own in-app
//   purchase for digital subscriptions, so the client hides the "Upgrade"
//   button inside the native (Capacitor) app (see IS_NATIVE in src/lib/env.ts).
//   The billing webhook (stripe-webhook) is what actually flips
//   profiles.is_premium — the client never writes that column (migration 0015).
//
// Security:
//   - verify_jwt is ON (default) — only signed-in users can call it. Do NOT
//     deploy with --no-verify-jwt. The caller is identified from their JWT; the
//     user id is stamped into the subscription metadata so the webhook can map
//     the subscription back to the right profile.
//
// Required function secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY   (required)  e.g. sk_live_… / sk_test_…
//   STRIPE_PRICE_ID     (required)  the recurring Price id for Premium, price_…
//   APP_URL             (optional)  fallback success/cancel origin, e.g. https://glpenpal.com
//
// Deploy: supabase functions deploy create-checkout
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  try {
    const secret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const priceId = Deno.env.get('STRIPE_PRICE_ID') ?? ''
    if (!secret || !priceId) {
      return new Response(JSON.stringify({ error: 'billing not configured' }), { status: 503, headers: HEADERS })
    }

    // Identify the caller from their Supabase JWT.
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: userData } = await userClient.auth.getUser()
    const user = userData?.user
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: HEADERS })

    const origin = req.headers.get('origin') || Deno.env.get('APP_URL') || 'https://glpenpal.com'
    const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      // Stamp the user id on BOTH the session and the subscription so the
      // webhook can map any later subscription event back to this profile.
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${origin}/journey-book?upgraded=1`,
      cancel_url: `${origin}/journey-book?upgraded=0`,
    })

    return new Response(JSON.stringify({ url: session.url }), { headers: HEADERS })
  } catch (e) {
    console.error('create-checkout failed', e)
    return new Response(JSON.stringify({ error: 'checkout failed' }), { status: 500, headers: HEADERS })
  }
})
