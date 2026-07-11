import { chromium } from 'playwright'
import { writeFileSync, copyFileSync, mkdirSync } from 'fs'

// Full-bleed app icon: warm off-white square + two people (sage + blue) forming
// a heart around a GLP-1 injection pen with a small coral heart. Opaque so iOS/
// Android round it cleanly (no black corners); the mark is inset for the
// maskable safe zone. viewBox 0..100.
const OUTER = 'M50,83 C50,83 15,57 15,39 C15,29 24,24 31,24 C39,24 46,30 50,38 C54,30 61,24 69,24 C76,24 85,29 85,39 C85,57 50,83 50,83 Z'
const INNER = 'M50,71 C50,71 28,53 28,42 C28,35 33,32 38,32 C43,32 47,36 50,41 C53,36 57,32 62,32 C67,32 72,35 72,42 C72,53 50,71 50,71 Z'
function svg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="#f4f1e8"/>
  <g transform="translate(8 9) scale(0.84)">
    <path d="${OUTER} ${INNER}" fill-rule="evenodd" fill="#5e8c74" clip-path="url(#L)"/>
    <path d="${OUTER} ${INNER}" fill-rule="evenodd" fill="#5f8497" clip-path="url(#R)"/>
    <clipPath id="L"><rect x="-2" y="-2" width="52" height="104"/></clipPath>
    <clipPath id="R"><rect x="50" y="-2" width="52" height="104"/></clipPath>
    <circle cx="31.5" cy="19" r="9" fill="#5e8c74"/>
    <circle cx="68.5" cy="19" r="9" fill="#5f8497"/>
    <g transform="rotate(-30 51 50)">
      <rect x="44.5" y="33" width="13" height="30" rx="6" fill="#2f3b34"/>
      <rect x="48.8" y="44" width="4.6" height="4.6" rx="1.3" fill="#cdd6d0"/>
      <rect x="49.4" y="63" width="3.2" height="6" rx="1" fill="#2f3b34"/>
    </g>
    <path d="M63.5,55 c1.4,-2.4 5,-1.4 5,1.3 c0,2.4 -3.4,4.4 -5,5.7 c-1.6,-1.3 -5,-3.3 -5,-5.7 c0,-2.7 3.6,-3.7 5,-1.3 Z" fill="#e8897a"/>
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
