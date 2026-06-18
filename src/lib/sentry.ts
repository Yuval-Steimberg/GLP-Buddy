import * as Sentry from '@sentry/react'
import { SENTRY_DSN } from './env'

// Initialise error + performance monitoring only when a DSN is configured,
// so local/demo builds stay quiet and dependency-free at runtime.
export function initSentry() {
  if (!SENTRY_DSN) return
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE,
  })
}

export { Sentry }
