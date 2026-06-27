import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppStoreProvider } from './store/AppStore'
import { App } from './App'
import { initSentry } from './lib/sentry'
import '@fontsource-variable/inter'
import './index.css'

initSentry()

// When a new deploy's service worker takes control, reload once so users
// always get the fresh build instead of a stale cached shell.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
