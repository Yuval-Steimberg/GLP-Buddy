import { chromium } from 'playwright'
const dir = '/tmp/claude-0/-home-user-GLP-Buddy/43029ffb-34cb-5253-93bb-e863bcfaa4dc/scratchpad'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await p.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await p.waitForTimeout(500)
await p.screenshot({ path: `${dir}/landing_top.png` })
await b.close(); console.log('ok')
