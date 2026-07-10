// Web Push subscription helper. Registers the browser for push and stores the
// subscription so a server / Supabase Edge Function can deliver notifications.
import { VAPID_PUBLIC_KEY } from './env'
import { supabase } from './supabase'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

/** Ask for permission, subscribe, and persist the subscription for `userId`. */
export async function enablePush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = sub.toJSON()
  if (supabase && json.keys) {
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    })
  }
  return true
}

/**
 * Show an OS notification while the app is running (foreground or backgrounded
 * but still alive). This is what surfaces a new-message alert without the full
 * server push pipeline. Note: once the PWA process is fully closed (common on
 * iOS), only real Web Push via the send-push Edge Function + a DB webhook can
 * wake it — see ACTIVATE-OPTIONAL.md.
 */
export async function showLocalNotification(title: string, body: string, link: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const opts: NotificationOptions = {
    body,
    tag: link, // collapse repeats from the same chat
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link },
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null
    if (reg) {
      await reg.showNotification(title, opts)
      return
    }
  } catch {
    /* fall through to the basic Notification */
  }
  try {
    new Notification(title, opts)
  } catch {
    /* ignore — some browsers only allow SW notifications */
  }
}
