import { chromium } from 'playwright'
import { writeFileSync, copyFileSync, mkdirSync } from 'fs'

// Full-bleed sage app icon: gradient square + white speech bubble with two
// "pen pal" dots (sage + sand). Opaque so iOS/Android round it cleanly (no
// black corners). viewBox 0..100.
function svg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="g" x1="8" y1="4" x2="92" y2="98" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5e8c74"/><stop offset="0.5" stop-color="#7ba890"/><stop offset="1" stop-color="#a7c6bd"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <g transform="translate(0 1)">
    <rect x="22" y="26" width="56" height="34" rx="12" fill="#ffffff"/>
    <path d="M34 56 L28.5 69.5 Q27.8 71.2 29.6 70.4 L46 59 Z" fill="#ffffff"/>
    <circle cx="42" cy="43" r="5.4" fill="#5e8c74"/>
    <circle cx="58" cy="43" r="5.4" fill="#c2955f"/>
    <rect x="46.6" y="40.4" width="6.8" height="3" rx="1.5" fill="#7ba890"/>
  </g>
</svg>`
}

const browser = await chromium.launch()
async function render(px) {
  const ctx = await browser.newContext({ viewport: { width: px, height: px }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const markup = svg().replace('width="100" height="100"', `width="${px}" height="${px}"`)
  await page.setContent(`<!doctype html><html><body style="margin:0">${markup}</body></html>`)
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: px, height: px } })
  await ctx.close()
  return buf
}

mkdirSync('public/icons', { recursive: true })
const targets = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/maskable-512.png', 512],
  ['public/icons/icon-1024.png', 1024],
  ['public/icons/apple-touch-icon.png', 180],
]
for (const [path, px] of targets) {
  writeFileSync(path, await render(px))
  console.log('wrote', path, px)
}
copyFileSync('public/icons/icon-1024.png', 'resources/icon.png')
console.log('copied resources/icon.png')
await browser.close()
