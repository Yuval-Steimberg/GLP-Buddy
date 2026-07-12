import type {
  BuddyRelationship,
  ChatMessage,
  Checkin,
  CheckinStatus,
  JourneyBook,
  JourneyChapter,
  Milestone,
  MilestoneType,
  TimelineEvent,
  YearReview,
} from '../types'

const DAY = 86400000

// Milestones ranked by "how big a deal" — used to surface a journey's headline.
const MILESTONE_RANK: MilestoneType[] = [
  'Reached goal weight',
  'Lost 10 kg',
  'Lost 5 kg',
  'Overcame plateau',
  'First month completed',
  'First week completed',
  'First injection completed',
  'Started medication',
  'Improved habits',
  'Custom milestone',
]

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return d.toLocaleString('en', { month: 'long', year: 'numeric' })
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

// Build one month's auto-written narrative from that month's raw activity.
function chapterStory(
  args: {
    monthsTogether: number
    isFirstMonth: boolean
    milestoneTypes: MilestoneType[]
    messages: number
    photos: number
    buddyName: string
  },
): string[] {
  const { monthsTogether, isFirstMonth, milestoneTypes, messages, photos, buddyName } = args
  const lines: string[] = []

  if (isFirstMonth) {
    lines.push(`This is where it began — you and ${buddyName} became buddies.`)
  } else if (monthsTogether > 0) {
    lines.push(
      monthsTogether % 12 === 0
        ? `${monthsTogether / 12} year${monthsTogether / 12 > 1 ? 's' : ''} together.`
        : `Together for ${monthsTogether} month${monthsTogether > 1 ? 's' : ''}.`,
    )
  }

  if (milestoneTypes.length > 0) {
    const unique = [...new Set(milestoneTypes)]
    lines.push(`Celebrated ${joinNatural(unique.map((t) => t.toLowerCase()))}.`)
  }

  if (messages > 0) {
    lines.push(`Exchanged ${messages} message${messages === 1 ? '' : 's'} of encouragement.`)
  }

  if (photos > 0) {
    lines.push(`Shared ${photos} photo${photos === 1 ? '' : 's'} along the way.`)
  }

  if (lines.length === (isFirstMonth || monthsTogether > 0 ? 1 : 0)) {
    lines.push('A quieter month — but you kept showing up for each other.')
  }

  return lines
}

// Assemble the full Journey Book for a relationship: cover stats + one chapter
// per month from the month they matched through the current month. Pure and
// deterministic (pass `now` for tests); reused by the screen and the exporters.
export function buildJourneyBook(args: {
  rel: BuddyRelationship
  meName: string
  buddyName: string
  milestones: Milestone[]
  messages: ChatMessage[]
  timeline: TimelineEvent[]
  now?: number
}): JourneyBook {
  const { rel, meName, buddyName } = args
  const now = args.now ?? Date.now()

  const relMilestones = args.milestones.filter((m) => m.relationshipId === rel.id)
  const relMessages = args.messages.filter((m) => m.relationshipId === rel.id)
  const relTimeline = args.timeline.filter((e) => e.relationshipId === rel.id)

  const start = new Date(rel.createdAt)
  const end = new Date(now)
  const totalMonthsSpan =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

  const chapters: JourneyChapter[] = []
  for (let i = 0; i <= totalMonthsSpan; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const y = d.getFullYear()
    const mo = d.getMonth()
    const inMonth = (ts: number) => {
      const t = new Date(ts)
      return t.getFullYear() === y && t.getMonth() === mo
    }

    const monthMilestones = relMilestones.filter((m) => inMonth(m.createdAt))
    const milestoneTypes = monthMilestones.map((m) => m.type)
    const messages = relMessages.filter((m) => inMonth(m.createdAt)).length
    const photos =
      relTimeline.filter((e) => e.type === 'photo' && inMonth(e.createdAt)).length +
      relMessages.filter((m) => m.imageUrl && inMonth(m.createdAt)).length

    chapters.push({
      key: monthKey(d),
      label: monthLabel(d),
      monthsTogether: i,
      milestoneTypes,
      milestones: monthMilestones.length,
      messages,
      photos,
      story: chapterStory({
        monthsTogether: i,
        isFirstMonth: i === 0,
        milestoneTypes,
        messages,
        photos,
        buddyName,
      }),
    })
  }

  const allTypes = relMilestones.map((m) => m.type)
  const topMilestone = MILESTONE_RANK.find((t) => allTypes.includes(t))

  return {
    meName,
    buddyName,
    startDate: rel.createdAt,
    totalDays: Math.max(0, Math.floor((now - rel.createdAt) / DAY)),
    totalMonths: totalMonthsSpan,
    totalMilestones: relMilestones.length,
    totalMessages: relMessages.length,
    totalPhotos: chapters.reduce((s, c) => s + c.photos, 0),
    topMilestone,
    chapters,
  }
}

// ---- Year in Review -------------------------------------------------------

// Side-effect check-in statuses that count as a "rough" day.
const TOUGH_STATUSES: CheckinStatus[] = ['nausea', 'fatigue', 'constipation', 'hungry', 'low']

// Which calendar years have any journey activity for this user — used to offer
// a year picker and to default to the most recent year with data.
export function availableReviewYears(args: {
  relationships: BuddyRelationship[]
  milestones: Milestone[]
  messages: ChatMessage[]
}): number[] {
  const years = new Set<number>()
  for (const r of args.relationships) years.add(new Date(r.createdAt).getFullYear())
  for (const m of args.milestones) years.add(new Date(m.createdAt).getFullYear())
  for (const m of args.messages) years.add(new Date(m.createdAt).getFullYear())
  return [...years].sort((a, b) => b - a)
}

// Aggregate a whole calendar year across ALL the user's buddies into a
// shareable recap. Pure/deterministic (pass `now` for tests).
export function buildYearReview(args: {
  year: number
  meId: string
  meName: string
  relationships: BuddyRelationship[] // all relationships the user belongs to
  milestones: Milestone[]
  messages: ChatMessage[]
  timeline: TimelineEvent[]
  checkins: Checkin[]
  now?: number
}): YearReview {
  const { year, meId, meName } = args
  const now = args.now ?? Date.now()
  const inYear = (ts: number) => new Date(ts).getFullYear() === year

  const myRels = args.relationships.filter((r) => r.userIds.includes(meId))
  const myRelIds = new Set(myRels.map((r) => r.id))

  const milestones = args.milestones.filter((m) => myRelIds.has(m.relationshipId) && inYear(m.createdAt))
  const messages = args.messages.filter((m) => myRelIds.has(m.relationshipId) && inYear(m.createdAt))
  const timeline = args.timeline.filter((e) => myRelIds.has(e.relationshipId) && inYear(e.createdAt))
  const checkins = args.checkins.filter((c) => c.userId === meId && inYear(c.createdAt))

  // Buddies connected at any point during the year (matched on/before year end,
  // and not ended before the year started).
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime()
  const buddies = new Set<string>()
  for (const r of myRels) {
    if (r.createdAt <= yearEnd) {
      const other = r.userIds.find((id) => id !== meId)
      if (other) buddies.add(other)
    }
  }

  // Journey start = earliest relationship or milestone overall.
  const allDates = [
    ...myRels.map((r) => r.createdAt),
    ...args.milestones.filter((m) => myRelIds.has(m.relationshipId)).map((m) => m.createdAt),
  ]
  const journeyStart = allDates.length ? Math.min(...allDates) : undefined
  const asOf = year === new Date(now).getFullYear() ? now : yearEnd
  const daysOnJourney = journeyStart ? Math.max(0, Math.floor((asOf - journeyStart) / DAY)) : 0

  // Photos: timeline photo posts + chat image messages.
  const photos =
    timeline.filter((e) => e.type === 'photo').length + messages.filter((m) => m.imageUrl).length

  // Tough weeks overcome: distinct ISO-ish weeks with at least one rough check-in.
  const toughWeekKeys = new Set<string>()
  for (const c of checkins) {
    if (!TOUGH_STATUSES.includes(c.status)) continue
    const d = new Date(c.createdAt)
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / DAY)
    toughWeekKeys.add(`${d.getFullYear()}-${Math.floor(dayOfYear / 7)}`)
  }

  // Strongest month: most milestones, tie-break most messages.
  const monthScore = new Array(12).fill(0).map(() => ({ ms: 0, msg: 0 }))
  for (const m of milestones) monthScore[new Date(m.createdAt).getMonth()].ms++
  for (const m of messages) monthScore[new Date(m.createdAt).getMonth()].msg++
  let bestMonth = -1
  monthScore.forEach((s, i) => {
    if (s.ms === 0 && s.msg === 0) return
    if (
      bestMonth === -1 ||
      s.ms > monthScore[bestMonth].ms ||
      (s.ms === monthScore[bestMonth].ms && s.msg > monthScore[bestMonth].msg)
    ) {
      bestMonth = i
    }
  })
  const strongestMonth =
    bestMonth >= 0 ? new Date(year, bestMonth, 1).toLocaleString('en', { month: 'long' }) : undefined

  // Biggest milestone reached this year.
  const types = milestones.map((m) => m.type)
  const topMilestone = MILESTONE_RANK.find((t) => types.includes(t))

  // A favourite encouragement: the most-reacted message you received this year
  // (tie-break the longest), trimmed to a shareable quote. No name attached.
  const received = messages
    .filter((m) => m.senderId !== meId && !m.fromCoach && m.text && m.text.trim().length > 0)
    .sort((a, b) => b.reactions.length - a.reactions.length || b.text.length - a.text.length)
  let favoriteEncouragement = received[0]?.text?.trim()
  if (favoriteEncouragement && favoriteEncouragement.length > 140) {
    favoriteEncouragement = favoriteEncouragement.slice(0, 137).trimEnd() + '…'
  }

  return {
    year,
    meName,
    journeyStart,
    daysOnJourney,
    buddies: buddies.size,
    milestones: milestones.length,
    messages: messages.length,
    photos,
    toughWeeks: toughWeekKeys.size,
    strongestMonth,
    topMilestone,
    favoriteEncouragement,
    hasData: milestones.length + messages.length + buddies.size > 0,
  }
}
