import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

// Native splash: warm off-white canvas with the centered sage badge (rounded
// gradient square + white speech bubble + two pen-pal dots). Minimal, calm.
const SIZE = 2732
const BADGE = 640 // px of the centered badge

function splashSvg() {
  const off = (SIZE - BADGE) / 2
  const s = BADGE / 100 // scale from the 100-grid glyph
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5e8c74"/><stop offset="0.5" stop-color="#7ba890"/><stop offset="1" stop-color="#a7c6bd"/>
    </linearGradient>
    <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="34" stdDeviation="44" flood-color="#2c4f3f" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#f6f4ee"/>
  <g transform="translate(${off} ${off}) scale(${s})" filter="url(#sh)">
    <rect width="100" height="100" rx="24" fill="url(#g)"/>
    <g transform="translate(0 1)">
      <rect x="22" y="26" width="56" height="34" rx="12" fill="#ffffff"/>
      <path d="M34 56 L28.5 69.5 Q27.8 71.2 29.6 70.4 L46 59 Z" fill="#ffffff"/>
      <circle cx="42" cy="43" r="5.4" fill="#5e8c74"/>
      <circle cx="58" cy="43" r="5.4" fill="#c2955f"/>
      <rect x="46.6" y="40.4" width="6.8" height="3" rx="1.5" fill="#7ba890"/>
    </g>
  </g>
</svg>`
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.setContent(`<!doctype html><html><body style="margin:0">${splashSvg()}</body></html>`)
writeFileSync('resources/splash.png', await page.screenshot({ clip: { x: 0, y: 0, width: SIZE, height: SIZE } }))
console.log('wrote resources/splash.png', SIZE)
await browser.close()
