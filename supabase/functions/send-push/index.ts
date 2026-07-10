// Supabase Edge Function (Deno) — delivers Web Push for new notifications.
//
// Wire it up as a Database Webhook: Database → Webhooks → on INSERT into
// `public.notifications`, POST to this function. It looks the new row up by id,
// finds the recipient's push subscriptions, and sends each one a Web Push.
//
// Required function secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEND_PUSH_SECRET
//
// SECURITY: this function uses the service-role key, so it must NOT trust the
// request body. Two guards:
//   1. A shared secret (SEND_PUSH_SECRET) that the Database Webhook sends as the
//      `x-webhook-secret` header. Without it, anyone holding the public anon key
//      could POST a forged payload and push arbitrary notifications to any user.
//      Configure the webhook to send this header with the same value.
//   2. The notification title/body/link are re-read from the DB by id — never
//      taken from the request body — so a forged/replayed body can't inject
//      attacker-controlled content.
//
// Deploy: supabase functions deploy send-push
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const WEBHOOK_SECRET = Deno.env.get('SEND_PUSH_SECRET') ?? ''

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@glpenpal.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

// Only deliver to real Web Push service hosts (defence-in-depth against a
// subscription row that somehow holds an internal/attacker endpoint → SSRF).
const ALLOWED_ENDPOINT =
  /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|push\.apple\.com|notify\.windows\.com|push\.services\.mozilla\.com|windows\.com)\//i

Deno.serve(async (req) => {
  try {
    // Guard 1: shared-secret check. Constant-ish comparison; reject if unset.
    const provided = req.headers.get('x-webhook-secret') ?? ''
    if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
      return new Response('unauthorized', { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const rowId = body?.record?.id ?? body?.id
    if (!rowId) return new Response('bad request', { status: 400 })

    // Guard 2: re-read the notification from the DB by id. Do NOT trust the body
    // for user_id/title/body/link.
    const { data: n } = await admin
      .from('notifications')
      .select('user_id, type, title, link')
      .eq('id', rowId)
      .single()
    if (!n?.user_id) return new Response('not found', { status: 404 })

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', n.user_id)

    // Current unread count → drives the home-screen app-icon badge.
    const { count: unread } = await admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', n.user_id)
      .eq('read', false)

    // Keep the pushed link same-app: only relative paths are forwarded to the SW.
    const safeLink =
      typeof n.link === 'string' && n.link.startsWith('/') && !n.link.startsWith('//')
        ? n.link
        : '/'

    // Privacy: the lock screen must not show chat content or health details.
    // The stored title is non-clinical ("Ana sent you a message", "…added a
    // milestone"); the body is kept generic. The full detail stays in-app only.
    const genericBody =
      n.type === 'message' ? 'Tap to open your chat.' : 'Open GLPenPal to see what\'s new.'

    const payload = JSON.stringify({
      title: n.title,
      body: genericBody,
      link: safeLink,
      badge: unread ?? 1,
    })

    await Promise.all(
      (subs ?? []).map(async (s) => {
        if (!ALLOWED_ENDPOINT.test(s.endpoint)) return
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
  } catch {
    // Never leak internal error detail to the caller.
    return new Response('error', { status: 500 })
  }
})
