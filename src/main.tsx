import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppStoreProvider } from './store/AppStore'
import { App } from './App'
import { InstallPrompt } from './components/InstallPrompt'
import { initSentry } from './lib/sentry'
import '@fontsource-variable/inter'
import './index.css'

initSentry()

// Optional privacy-friendly analytics (Plausible). Activates only when
// VITE_PLAUSIBLE_DOMAIN is set (e.g. "glpenpal.com") — no-op otherwise.
const analyticsDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
if (analyticsDomain) {
  const s = document.createElement('script')
  s.defer = true
  s.setAttribute('data-domain', String(analyticsDomain))
  s.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(s)
}

// When a NEW deploy's service worker takes over, reload once so users get the
// fresh build. We must ignore the very first controllerchange on a fresh load
// (the initial SW install claiming the page) — reloading on that made the app
// load twice on first visit.
if ('serviceWorker' in navigator) {
  let refreshing = false
  let hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    if (!hadController) {
      // First-ever control acquisition on this page — not an update.
      hadController = true
      return
    }
    refreshing = true
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppStoreProvider>
        <App />
        <InstallPrompt />
      </AppStoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
