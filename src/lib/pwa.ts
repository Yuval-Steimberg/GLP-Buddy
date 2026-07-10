import { useEffect, useState } from 'react'

// The `beforeinstallprompt` event isn't in the standard TS lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'glpenpal-install-dismissed'
const DISMISS_DAYS = 14

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function dismissedRecently(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY))
    if (!ts) return false
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/** Detect iOS Safari, where PWAs install via Share → Add to Home Screen only. */
function detectIOSSafari(): boolean {
  const ua = window.navigator.userAgent
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as a Mac; disambiguate via touch points.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkit = /webkit/i.test(ua)
  const otherBrowser = /crios|fxios|edgios|opios|chrome|android/i.test(ua)
  return iOS && webkit && !otherBrowser
}

export interface InstallState {
  /** Show the install UI at all? */
  canShow: boolean
  /** True on iOS Safari — render manual "Add to Home Screen" instructions. */
  iosSafari: boolean
  /** Trigger the native install dialog (Chromium). No-op on iOS. */
  install: () => Promise<void>
  /** Hide the prompt and remember the dismissal for a couple of weeks. */
  dismiss: () => void
}

// Captures installability and exposes a tiny API for the install banner.
export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosSafari, setIosSafari] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }
    setDismissed(dismissedRecently())
    setIosSafari(detectIOSSafari())

    const onBIP = (e: Event) => {
      e.preventDefault() // stop Chrome's mini-infobar; we show our own UI
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  const canShow = !installed && !dismissed && (!!deferred || iosSafari)
  return { canShow, iosSafari, install, dismiss }
}
