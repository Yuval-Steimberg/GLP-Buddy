// Supabase Edge Function (Deno) — delivers Web Push for new notifications.
//
// Wire it up as a Database Webhook: Database → Webhooks → on INSERT into
// `public.notifications`, POST to this function. It reads the new row, looks
// up the recipient's push subscriptions, and sends each one a Web Push.
//
// Required function secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: supabase functions deploy send-push
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@glpbuddy.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    // Database Webhook payload shape: { type, table, record, ... }
    const n = body.record ?? body
    if (!n?.user_id) return new Response('no user', { status: 400 })

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', n.user_id)

    const payload = JSON.stringify({ title: n.title, body: n.body, link: n.link ?? '/' })

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          )
        } catch (err) {
          // 404/410 => expired subscription; clean it up.
          // deno-lint-ignore no-explicit-any
          if ((err as any)?.statusCode === 404 || (err as any)?.statusCode === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          }
        }
      }),
    )

    return new Response('ok')
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 })
  }
})
