import { SENTRY_DSN } from './env'

// Initialise error + performance monitoring only when a DSN is configured.
// The @sentry/react bundle (~50 kB gzip) is dynamically imported, so builds
// without a DSN never download it — keeping initial load lean.
export async function initSentry() {
  if (!SENTRY_DSN) return
  const Sentry = await import('@sentry/react')
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    // Health app: never let user-generated content (chat text, bios, milestone
    // notes) ride along in error reports or console breadcrumbs.
    beforeSend(event) {
      if (event.request?.data) delete event.request.data
      if (event.user) event.user = { id: event.user.id }
      return event
    },
    beforeBreadcrumb(crumb) {
      // Drop console breadcrumbs entirely — they can capture interpolated
      // message/profile strings from console.error calls.
      return crumb.category === 'console' ? null : crumb
    },
  })
}
