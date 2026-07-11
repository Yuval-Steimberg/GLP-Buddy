import { chromium } from 'playwright'
const dir = '/tmp/claude-0/-home-user-GLP-Buddy/43029ffb-34cb-5253-93bb-e863bcfaa4dc/scratchpad'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await p.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await p.waitForTimeout(400)
await p.screenshot({ path: `${dir}/landing_top2.png` })
// auth screen
await p.getByRole('button', { name: /find my pen pal/i }).first().click().catch(()=>{})
await p.waitForTimeout(300)
// navigate to auth via sign in link if present
await p.goto('http://localhost:4173', { waitUntil: 'networkidle' })
const signin = p.getByText(/^Sign in$/).first()
if (await signin.count()) { await signin.click().catch(()=>{}) }
await p.waitForTimeout(400)
await p.screenshot({ path: `${dir}/auth2.png` })
await b.close(); console.log('ok')
