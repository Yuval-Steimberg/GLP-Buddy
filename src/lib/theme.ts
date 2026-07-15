// Theme (light / dark / follow-system) preference.
//
// The resolved theme is applied as a `data-theme` attribute on <html>; the CSS
// design system (src/index.css) redeclares the palette variables under
// `:root[data-theme="dark"]`. A tiny inline script in index.html applies the
// stored choice BEFORE the bundle loads to avoid a flash of the wrong theme, so
// this module and that script must agree on the localStorage key + logic.

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'glpenpal-theme'
// Matches the dark `--bg`; used for the PWA status-bar / notch tint.
const DARK_THEME_COLOR = '#12181a'
// Existing light status-bar tint (sage) — unchanged from before dark mode.
const LIGHT_THEME_COLOR = '#5e8c74'

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* localStorage may be unavailable */ }
  return 'system'
}

export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'system') return prefersDark() ? 'dark' : 'light'
  return choice
}

export function applyTheme(choice: ThemeChoice = getThemeChoice()): void {
  const resolved = resolveTheme(choice)
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
}

export function setThemeChoice(choice: ThemeChoice): void {
  try { localStorage.setItem(KEY, choice) } catch { /* ignore */ }
  applyTheme(choice)
}

/**
 * Apply the stored theme and keep "system" in sync with OS changes. Called once
 * at boot from main.tsx. The initial paint is handled by the inline script in
 * index.html; this re-applies (harmless) and wires up the live listener.
 */
export function initTheme(): void {
  applyTheme()
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  mq?.addEventListener?.('change', () => {
    if (getThemeChoice() === 'system') applyTheme('system')
  })
}
