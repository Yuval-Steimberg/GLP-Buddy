// End-to-end smoke test of the core demo flow (local mode).
// Run against a preview server: `node tests/smoke.mjs` (BASE overrides URL).
import { chromium } from 'playwright'

const base = process.env.BASE || 'http://localhost:4173'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

async function step(name, fn) {
  await fn()
  await page.waitForTimeout(200)
  console.log('OK:', name)
}

await page.goto(base, { waitUntil: 'networkidle' })
await step('landing -> find buddy', async () => { await page.getByRole('button', { name: /find my pen pal/i }).first().click() })
await step('onboarding name/age/gender', async () => {
  await page.locator('input.input').first().fill('Sam')
  await page.getByRole('button', { name: '25–34' }).click()
  await page.getByRole('button', { name: 'Woman', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
})
await step('prefs', async () => {
  await page.getByRole('button', { name: 'No preference' }).click()
  await page.locator('select.input').nth(1).selectOption('United States')
  await page.getByRole('button', { name: 'Continue' }).click()
})
await step('medication', async () => {
  await page.getByRole('button', { name: 'Wegovy' }).click()
  await page.getByRole('button', { name: '1–3 months' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
})
await step('weight', async () => {
  await page.getByRole('button', { name: '90–100 kg' }).first().click()
  await page.getByRole('button', { name: '70–80 kg' }).nth(1).click()
  await page.getByRole('button', { name: 'Continue' }).click()
})
await step('goal/comm', async () => {
  await page.getByRole('button', { name: 'Accountability' }).click()
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
})
await step('bio', async () => {
  await page.locator('textarea.input').fill('I love hiking and cooking, mum of two.')
  await page.getByRole('button', { name: 'Build my matches' }).click()
})
await step('safety accept', async () => {
  const boxes = page.locator('input[type=checkbox]')
  const n = await boxes.count()
  for (let i = 0; i < n; i++) await boxes.nth(i).check()
  await page.getByRole('button', { name: /I agree/ }).click()
})
await page.waitForURL('**/matches')
await step('connect', async () => { await page.getByRole('button', { name: "I'd like to connect" }).first().click() })
await page.waitForTimeout(4000)
await step('buddy space', async () => {
  await page.goto(base + '/home', { waitUntil: 'networkidle' })
  const buddyHead = page.locator('.buddy-head')
  if (await buddyHead.count() < 1) throw new Error('not matched')
  await buddyHead.first().click()
  if (await page.getByText('Days connected').count() < 1) throw new Error('not matched')
})
await step('chat send', async () => {
  await page.getByRole('button', { name: /Chat/ }).first().click()
  await page.waitForURL('**/chat/**')
  await page.locator('input.input').fill('Hey buddy!')
  await page.locator('button.send').click()
  await page.waitForTimeout(300)
  if (await page.getByText('Hey buddy!').count() < 1) throw new Error('message not sent')
  // Medical-advice classifier should warn (but not block) on dosing language.
  await page.locator('input.input').fill('should i increase my dose to 1 mg?')
  await page.waitForTimeout(200)
  if (await page.getByText(/looks like dosing or medical advice/i).count() < 1)
    throw new Error('medical-advice classifier did not warn')
  await page.locator('input.input').fill('')
})
await step('milestone -> timeline', async () => {
  await page.goto(base + '/home', { waitUntil: 'networkidle' })
  await page.locator('.buddy-head').first().click()
  await page.getByRole('button', { name: /milestone/i }).first().click()
  await page.getByRole('button', { name: /Reached goal weight/ }).click()
  await page.getByRole('button', { name: 'Add to timeline' }).click()
  await page.waitForTimeout(300)
  await page.goto(base + '/timeline', { waitUntil: 'networkidle' })
  if (await page.getByText('Reached goal weight').count() < 1) throw new Error('milestone missing')
})
await step('notifications', async () => {
  await page.goto(base + '/notifications', { waitUntil: 'networkidle' })
  if (await page.locator('.card').count() < 1) throw new Error('no notifications')
})

await browser.close()
if (errors.length) {
  console.log('\n--- ERRORS ---')
  errors.forEach((e) => console.log(e))
  process.exit(1)
}
console.log('\nALL STEPS PASSED, no console/page errors.')
