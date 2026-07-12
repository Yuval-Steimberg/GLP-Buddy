// Centralised, typed access to build-time environment configuration.
import { Capacitor } from '@capacitor/core'

const env = import.meta.env

/**
 * True when running inside the Capacitor native app (iOS/Android) rather than
 * the web PWA. Apple/Google mandate their own in-app purchase for digital
 * subscriptions, so the Stripe web checkout MUST be hidden here — showing it in
 * a native build is grounds for App Store rejection.
 */
export const IS_NATIVE = Capacitor.isNativePlatform()

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
export const SENTRY_DSN = (env.VITE_SENTRY_DSN ?? '').trim()
export const VAPID_PUBLIC_KEY = (env.VITE_VAPID_PUBLIC_KEY ?? '').trim()

const mode = (env.VITE_BACKEND ?? 'auto').trim()

/** True when the app should talk to the real Supabase backend. */
export const USE_SUPABASE =
  mode === 'supabase' ||
  (mode === 'auto' && SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0)

/** Local demo mode: mock data persisted to localStorage, no auth required. */
export const USE_LOCAL = !USE_SUPABASE
