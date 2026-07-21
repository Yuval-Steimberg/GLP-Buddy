import { useLocation } from 'react-router-dom'
import { useInstallPrompt } from '../lib/pwa'
import { BrandMark, Icon } from './Icon'

// A dismissible "Install app" banner. On Chromium (Android/desktop) it triggers
// the native install dialog; on iOS Safari — which has no install API — it shows
// the Share → Add to Home Screen steps. Hidden once installed or dismissed, and
// never shown when already running as an installed PWA.
//
// Suppressed on the public marketing landing page ("/") — once the native App
// Store / Google Play links are live there (see StoreBadges in Landing.tsx),
// pointing a fresh visitor at "add to home screen" instead of the real store
// listings is the wrong nudge. It still shows elsewhere in the app (e.g. for
// existing signed-in PWA users navigating the product).
export function InstallPrompt() {
  const { pathname } = useLocation()
  const { canShow, iosSafari, install, dismiss } = useInstallPrompt()
  if (pathname === '/' || !canShow) return null

  return (
    <div className="install-banner" role="dialog" aria-label="Install GLPenPal">
      <button className="install-close" onClick={dismiss} aria-label="Dismiss">
        <Icon name="close" size={16} />
      </button>
      <div className="install-row">
        <span className="install-mark"><BrandMark size={38} /></span>
        <div className="install-copy">
          <strong>Install GLPenPal</strong>
          {iosSafari ? (
            <span>
              Tap <Icon name="share" size={15} style={{ verticalAlign: '-3px' }} /> then
              <strong> Add to Home Screen</strong> for the full-screen app.
            </span>
          ) : (
            <span>Add it to your home screen — full-screen, fast, and offline-ready.</span>
          )}
        </div>
      </div>
      {!iosSafari && (
        <button className="btn install-cta" onClick={install}>
          <Icon name="download" size={18} /> Install app
        </button>
      )}
    </div>
  )
}
