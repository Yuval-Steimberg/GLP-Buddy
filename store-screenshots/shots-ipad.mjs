import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'http://localhost:4196'

// Apple 13" iPad: 2048 x 2732 px = 1024 x 1366 logical @ dsf 2 (portrait).
const WIDTH = 1024
const HEIGHT = 1366
const DSF = 2

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

const me = {
  id: 'me_demo', createdAt: now - 40 * DAY, acceptedSafety: true, onboardingComplete: true, endedRelationshipCount: 0,
  profile: { nickname: 'Jordan', ageRange: '35–44', gender: 'Woman', genderPreference: 'No preference', language: 'English', country: 'United States', medication: 'Wegovy', treatmentStage: '1–3 months', currentWeightRange: '90–100 kg', goalWeightRange: '70–80 kg', mainGoal: 'Accountability', communicationPreference: 'Daily', bio: 'Two months in and finally finding my rhythm. Love morning walks, cooking, and cheering other people on.', interests: ['Hiking', 'Cooking', 'Reading', 'Coffee'] },
}
const maya = {
  id: 'u_maya', createdAt: now - 120 * DAY, acceptedSafety: true, onboardingComplete: true, endedRelationshipCount: 0,
  profile: { nickname: 'Maya', ageRange: '35–44', gender: 'Woman', genderPreference: 'No preference', language: 'English', country: 'United States', medication: 'Wegovy', treatmentStage: '1–3 months', currentWeightRange: '90–100 kg', goalWeightRange: '70–80 kg', mainGoal: 'Accountability', communicationPreference: 'Daily', bio: 'Mum of two, part-time nurse. I love hiking on weekends. The nausea weeks are rough and I do better when I am not alone.', interests: ['Hiking', 'Cooking', 'Reality TV', 'Gardening'] },
}
const rel = { id: 'rel_demo', userIds: ['me_demo', 'u_maya'], createdAt: now - 22 * DAY, active: true, levelKeys: ['first_week'] }
const messages = [
  ['u_maya', 'Morning! Did you get your shot in yesterday? 💪', 360],
  ['me_demo', 'I did! Day 3 nausea was rough but tea + crackers helped a lot.', 340],
  ['u_maya', "That's the trick honestly. Small and bland the first few days.", 310],
  ['me_demo', 'How are you feeling this week? You said week 2 was tough last time.', 240],
  ['u_maya', 'So much better! Down another kg and actually had energy for a hike 🥾', 200],
  ['me_demo', "Amazing!! That's huge. So proud of you 🎉", 175],
  ['u_maya', "Couldn't have kept going without someone to check in with. Same time tomorrow?", 90],
  ['me_demo', 'Always. Talk in the morning ☀️', 42],
].map(([senderId, text, minsAgo], i) => ({ id: `msg_${i}`, relationshipId: 'rel_demo', senderId, text, createdAt: now - minsAgo * 60000, reactions: i === 5 ? ['❤️'] : i === 4 ? ['🎉', '👏'] : [] }))
const milestones = [
  { id: 'ms_1', relationshipId: 'rel_demo', authorId: 'me_demo', type: 'First week completed', note: 'Made it through the first week of side effects together.', createdAt: now - 15 * DAY },
  { id: 'ms_2', relationshipId: 'rel_demo', authorId: 'u_maya', type: 'Lost 5 kg', note: 'Five kilos down and feeling stronger every week!', createdAt: now - 5 * DAY },
  { id: 'ms_3', relationshipId: 'rel_demo', authorId: 'me_demo', type: 'Improved habits', note: 'Walking every morning before work now — 12 days straight.', createdAt: now - 1 * DAY },
]
const timeline = [
  { id: 'tl_1', relationshipId: 'rel_demo', type: 'level', authorId: 'me_demo', text: 'You unlocked: First week together 🌟', reactions: ['🎉'], createdAt: now - 15 * DAY },
  { id: 'tl_2', relationshipId: 'rel_demo', type: 'milestone', authorId: 'u_maya', text: 'Maya reached a milestone: Lost 5 kg', refId: 'ms_2', reactions: ['❤️', '👏', '💪'], createdAt: now - 5 * DAY },
  { id: 'tl_3', relationshipId: 'rel_demo', type: 'reflection', authorId: 'me_demo', text: 'The hardest part was week one. Having someone who just got it made all the difference.', reactions: ['🤗'], createdAt: now - 3 * DAY },
  { id: 'tl_4', relationshipId: 'rel_demo', type: 'milestone', authorId: 'me_demo', text: 'You reached a milestone: Improved habits', refId: 'ms_3', reactions: ['👏'], createdAt: now - 1 * DAY },
]
const suggestion = (id, daysAgo, p) => ({ id, createdAt: now - daysAgo * DAY, acceptedSafety: true, onboardingComplete: true, endedRelationshipCount: 0, profile: p })
const others = [maya,
  suggestion('u_priya', 30, { nickname: 'Priya', ageRange: '25–34', gender: 'Woman', genderPreference: 'No preference', language: 'English', country: 'United States', medication: 'Wegovy', treatmentStage: '1–3 months', currentWeightRange: '80–90 kg', goalWeightRange: '70–80 kg', mainGoal: 'Accountability', communicationPreference: 'Daily', bio: 'Two months in and figuring out portion sizes again. UX designer, big into pottery and long morning walks.', interests: ['Pottery', 'Walking', 'Cooking', 'Coffee'] }),
  suggestion('u_daniel', 60, { nickname: 'Daniel', ageRange: '35–44', gender: 'Man', genderPreference: 'No preference', language: 'English', country: 'United Kingdom', medication: 'Wegovy', treatmentStage: '1–3 months', currentWeightRange: '100–110 kg', goalWeightRange: '85–95 kg', mainGoal: 'Motivation', communicationPreference: 'Daily', bio: 'Software engineer, dad, amateur cyclist trying to get back on the bike. Would love a buddy to swap small wins with.', interests: ['Cycling', 'Cooking', 'Reading', 'Coffee'] }),
]
const state = { currentUserId: 'me_demo', users: Object.fromEntries([me, ...others].map((u) => [u.id, u])), approvals: [], relationships: [rel], messages, milestones, timeline, notifications: [], reports: [], trios: [], trioMessages: [], passedUserIds: [] }

const shots = [
  { name: 'ipad-01-chat', route: '/chat/rel_demo' },
  { name: 'ipad-02-home', route: '/home' },
  { name: 'ipad-03-timeline', route: '/timeline' },
  { name: 'ipad-04-matches', route: '/matches' },
]

const browser = await chromium.launch()
const viewport = { width: WIDTH, height: HEIGHT }

const cleanCtx = await browser.newContext({ viewport, deviceScaleFactor: DSF })
const landing = await cleanCtx.newPage()
await landing.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await landing.waitForTimeout(900)
await landing.screenshot({ path: join(__dirname, 'ipad-00-landing.png') })
console.log('captured ipad-00-landing')
await cleanCtx.close()

const ctx = await browser.newContext({ viewport, deviceScaleFactor: DSF })
const page = await ctx.newPage()
await page.addInitScript((s) => { localStorage.setItem('glpenpal-state-v1', JSON.stringify(s)) }, state)
for (const s of shots) {
  await page.goto(`${BASE}${s.route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(__dirname, `${s.name}.png`) })
  console.log(`captured ${s.name}`)
}
await browser.close()
console.log('DONE')
