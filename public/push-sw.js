/* global self, clients */
// Custom push handlers, imported into the generated service worker.
// Receives Web Push payloads and shows a notification; focuses/opens the app
// on click. The matching server sends payloads as JSON { title, body, link }.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { title: 'GLPenPal', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'GLPenPal'
  const ops = [
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.link || '/', // so reading that chat can dismiss it
      data: { link: data.link || '/' },
    }),
  ]
  // Update the home-screen icon badge (kept inside waitUntil so iOS doesn't
  // terminate the worker before it applies).
  if (typeof data.badge === 'number' && self.navigator && self.navigator.setAppBadge) {
    ops.push(self.navigator.setAppBadge(data.badge).catch(() => {}))
  }
  event.waitUntil(Promise.all(ops))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = (event.notification.data && event.notification.data.link) || '/'
  // Only navigate to same-origin relative paths — never an absolute URL from the
  // push payload (would let a forged/crafted push open a phishing page inside the
  // installed app's chrome, which has no URL bar).
  const link = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(link)
          return w.focus()
        }
      }
      return clients.openWindow(link)
    }),
  )
})
