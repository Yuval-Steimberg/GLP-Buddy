// Dark-mode / theme preference — a device-level UI setting kept deliberately
// OUTSIDE the AppStore/Supabase state (it's per-device, not per-account, and we
// don't want it entangled with hydrate/RLS). The choice lives in its own
// localStorage key and drives `data-theme` on <html>; the palette override lives
// in src/index.css under `:root[data-theme='dark']`.
//
// No-FOUC note: the *initial* theme is applied by a tiny inline script in
// index.html (runs before first paint). This module handles runtime changes and
// keeps 'system' in sync with the OS setting.
import { useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'glpenpal-theme'
// Keep these in sync with index.html's inline bootstrap script + the CSS palette.
const META_DARK = '#12181a'
const META_LIGHT = '#5e8c74'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* localStorage may be unavailable (private mode) — fall through */
  }
  return 'system'
}

/** The concrete mode ('light' | 'dark') a choice currently resolves to. */
export function resolvedTheme(choice: ThemeChoice = getThemeChoice()): 'light' | 'dark' {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return choice
}

function apply(choice: ThemeChoice) {
  if (typeof document === 'undefined') return
  const mode = resolvedTheme(choice)
  document.documentElement.setAttribute('data-theme', mode)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', mode === 'dark' ? META_DARK : META_LIGHT)
}

// Subscribers so the in-app control re-renders when the choice changes anywhere.
const listeners = new Set<(c: ThemeChoice) => void>()

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    /* ignore persistence failure — still apply for this session */
  }
  apply(choice)
  listeners.forEach((l) => l(choice))
}

/** Apply the stored choice and keep 'system' synced to OS changes. Call once at startup. */
export function initTheme() {
  apply(getThemeChoice())
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getThemeChoice() === 'system') apply('system')
  }
  // Safari <14 only supports the deprecated addListener signature.
  if (mq.addEventListener) mq.addEventListener('change', onChange)
  else if (mq.addListener) mq.addListener(onChange)
}

/** React binding: `const [choice, setChoice] = useTheme()`. */
export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice)
  useEffect(() => {
    const l = (c: ThemeChoice) => setChoice(c)
    listeners.add(l)
    // Re-sync in case the value changed between initial render and mount.
    setChoice(getThemeChoice())
    return () => { listeners.delete(l) }
  }, [])
  return [choice, setThemeChoice]
}
