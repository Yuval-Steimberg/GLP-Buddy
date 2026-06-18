// Pull a full AppState snapshot for the signed-in user from Supabase.
// Used in Supabase mode on load and after every mutating action (refetch
// semantics keep the cache correct without juggling optimistic client IDs).
import * as api from '../services/api'
import { buildEmptyState } from '../data/mockData'
import type { AppState, BuddyTrioGroup, TrioMessage, User } from '../types'
import {
  rowToApproval,
  rowToMessage,
  rowToMilestone,
  rowToNotification,
  rowToRelationship,
  rowToTimeline,
  rowToTrioMessage,
  rowToUser,
} from './mappers'

export async function hydrate(userId: string): Promise<AppState> {
  const state = buildEmptyState()
  state.currentUserId = userId

  // Users: me + the candidate pool (includes current buddies).
  const users: Record<string, User> = {}
  const me = await api.profiles.get(userId)
  if (me) users[me.id] = rowToUser(me)
  const candidates = await api.profiles.candidates(userId)
  candidates.forEach((c) => {
    users[c.id] = rowToUser(c)
  })
  state.users = users

  // Approvals → incoming/outgoing/passed all derive from this in selectors.
  const approvals = await api.matching.allForUser(userId)
  state.approvals = approvals.map(rowToApproval)
  state.passedUserIds = approvals
    .filter((a) => a.from_user === userId && a.status === 'passed')
    .map((a) => a.to_user)

  // Relationships and their nested data.
  const rels = await api.relationships.active(userId)
  state.relationships = rels.map(rowToRelationship)
  for (const rel of rels) {
    const [msgs, miles, tl] = await Promise.all([
      api.chat.list(rel.id),
      api.milestones.list(rel.id),
      api.timeline.list(rel.id),
    ])
    state.messages.push(...msgs.map(rowToMessage))
    state.milestones.push(...miles.map(rowToMilestone))
    state.timeline.push(...tl.map(rowToTimeline))
  }

  // Notifications.
  const notifs = await api.notifications.list(userId)
  state.notifications = notifs.map(rowToNotification)

  // Trios (active + pending) and their messages.
  const trioRows = await api.trios.mine(userId)
  const trios: BuddyTrioGroup[] = []
  const trioMessages: TrioMessage[] = []
  for (const { trio, members } of trioRows) {
    trios.push({
      id: trio.id,
      createdAt: Date.parse(trio.created_at),
      active: trio.active,
      memberIds: members.filter((m) => m.approved).map((m) => m.user_id),
      pendingMemberIds: members.filter((m) => !m.approved).map((m) => m.user_id),
    })
    const tmsgs = await api.trios.messages(trio.id)
    trioMessages.push(...tmsgs.map(rowToTrioMessage))
  }
  state.trios = trios
  state.trioMessages = trioMessages

  return state
}
