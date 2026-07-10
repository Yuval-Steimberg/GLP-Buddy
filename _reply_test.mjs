import { chromium } from 'playwright'
const base = process.env.BASE || 'http://localhost:4173'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
async function step(name, fn) { await fn(); await page.waitForTimeout(200); console.log('OK:', name) }

await page.goto(base, { waitUntil: 'networkidle' })
await step('landing -> find buddy', async () => { await page.getByRole('button', { name: /find my pen pal/i }).first().click() })
await step('onboarding name/age/gender', async () => {
  await page.locator('input.input').first().fill('Sam')
  await page.getByRole('button', { name: '25–34' }).click()
  await page.getByRole('button', { name: 'Woman', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
})
await step('prefs', async () => {
  await page.getByRole('button', { name: 'No preference' }).click()
  await page.locator('select.input').nth(1).selectOption('United States')
  await page.getByRole('button', { name: 'Next' }).click()
})
await step('medication', async () => {
  await page.getByRole('button', { name: 'Wegovy' }).click()
  await page.getByRole('button', { name: '1–3 months' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
})
await step('weight', async () => {
  await page.getByRole('button', { name: '90–100 kg' }).first().click()
  await page.getByRole('button', { name: '70–80 kg' }).nth(1).click()
  await page.getByRole('button', { name: 'Next' }).click()
})
await step('goal/comm', async () => {
  await page.getByRole('button', { name: 'Accountability' }).click()
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
})
await step('bio', async () => {
  await page.locator('textarea.input').fill('I love hiking and cooking, mum of two.')
  await page.getByRole('button', { name: 'Continue' }).click()
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
await step('open chat', async () => {
  await page.goto(base + '/home', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Chat/ }).first().click()
  await page.waitForURL('**/chat/**')
})
await step('send original', async () => {
  await page.locator('input.input').fill('First message')
  await page.locator('button.send').click()
  await page.waitForTimeout(300)
  if (await page.getByText('First message').count() < 1) throw new Error('original not sent')
})
await step('open reply via tap menu', async () => {
  await page.getByText('First message').first().click()
  await page.locator('.react-reply').first().click()
  await page.waitForTimeout(150)
  if (await page.locator('.reply-preview').count() < 1) throw new Error('reply preview did not appear')
  const q = await page.locator('.reply-preview-text').first().innerText()
  if (!q.includes('First')) throw new Error('wrong quote in preview: ' + q)
})
await step('send reply -> quote renders', async () => {
  await page.locator('input.input').fill('This is my reply')
  await page.locator('button.send').click()
  await page.waitForTimeout(300)
  if (await page.getByText('This is my reply').count() < 1) throw new Error('reply not sent')
  if (await page.locator('.bubble-quote').count() < 1) throw new Error('quoted block not rendered')
  if (await page.locator('.reply-preview').count() > 0) throw new Error('preview should clear after send')
})
await step('tap quote jumps to original', async () => {
  await page.locator('.bubble-quote').first().click()
  await page.waitForTimeout(400)
})

await browser.close()
if (errors.length) { console.log('\n--- ERRORS ---'); errors.forEach(e => console.log(e)); process.exit(1) }
console.log('\nREPLY FEATURE VERIFIED, no console/page errors.')
