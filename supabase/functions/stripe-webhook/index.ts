// Supabase Edge Function (Deno) — Stripe billing webhook. This is the ONLY thing
// that flips profiles.is_premium (migration 0015 makes that column writable by
// the service role only — never by clients).
//
// Security:
//   - Deploy WITH --no-verify-jwt (Stripe can't send a Supabase JWT). The
//     Stripe signature is verified instead, which is the real gate.
//   - Uses the service role to update profiles.is_premium, bypassing RLS.
//
// It maps a Stripe subscription back to a GLPenPal user via the `user_id` we
// stamped into the subscription metadata in create-checkout — so no
// stripe_customer_id column is needed.
//
// Required function secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY           (required)
//   STRIPE_WEBHOOK_SECRET       (required)  the signing secret for this endpoint, whsec_…
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected.)
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Then add the function URL as a Stripe webhook endpoint subscribed to:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

async function setPremium(userId: string, value: boolean) {
  if (!userId) return
  const { error } = await admin.from('profiles').update({ is_premium: value }).eq('id', userId)
  if (error) console.error('setPremium failed', userId, error)
}

// Active-ish subscription statuses that should keep Premium on.
const LIVE = new Set(['active', 'trialing', 'past_due'])

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  if (!sig || !whSecret) return new Response('missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret, undefined, cryptoProvider)
  } catch (e) {
    console.error('signature verification failed', e)
    return new Response('bad signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const userId = (s.metadata?.user_id as string) || (s.client_reference_id as string) || ''
        await setPremium(userId, true)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = (sub.metadata?.user_id as string) || ''
        await setPremium(userId, LIVE.has(sub.status))
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = (sub.metadata?.user_id as string) || ''
        await setPremium(userId, false)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('webhook handler error', e)
    return new Response('handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
