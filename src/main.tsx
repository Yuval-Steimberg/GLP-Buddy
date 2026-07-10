import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppStoreProvider } from './store/AppStore'
import { App } from './App'
import { InstallPrompt } from './components/InstallPrompt'
import { initSentry } from './lib/sentry'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
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

// NOTE: we deliberately do NOT add a controllerchange → reload handler here.
// vite-plugin-pwa's `registerType: 'autoUpdate'` already applies the new
// service worker and reloads once. A manual reload on top of that caused the
// app to load twice.

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
