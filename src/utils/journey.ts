import type {
  BuddyRelationship,
  ChatMessage,
  JourneyBook,
  JourneyChapter,
  Milestone,
  MilestoneType,
  TimelineEvent,
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
