// Pull a full AppState snapshot for the signed-in user from Supabase.
// Used in Supabase mode on load and after every mutating action (refetch
// semantics keep the cache correct without juggling optimistic client IDs).
import * as api from '../services/api'
import { buildEmptyState } from '../data/mockData'
import type { AppState, BuddyTrioGroup, TrioMessage, User } from '../types'
import {
  rowToApproval,
  rowToCheckin,
  rowToMessage,
  rowToMilestone,
  rowToNotification,
  rowToRelationship,
  rowToTimeline,
  rowToTrioMessage,
  rowToUser,
  rowToWeightLog,
} from './mappers'

export async function hydrate(userId: string): Promise<AppState> {
  const state = buildEmptyState()
  state.currentUserId = userId

  // Fetch the independent top-level collections in parallel.
  const [me, candidates, approvals, rels, notifs, trioRows] = await Promise.all([
    api.profiles.get(userId),
    api.profiles.candidates(userId),
    api.matching.allForUser(userId),
    api.relationships.active(userId),
    api.notifications.list(userId),
    api.trios.mine(userId),
  ])

  // Users: the (bounded, minimized) discovery pool, then the signed-in user.
  const users: Record<string, User> = {}
  candidates.forEach((c) => { users[c.id] = rowToUser(c) })
  if (me) users[me.id] = rowToUser(me)

  // Fetch full profiles for everyone the user is connected to (buddies, pending
  // approvals, trio co-members). Profile reads are now scoped to connections
  // (RLS), and these carry authoritative data the minimized discovery rows omit.
  const relatedIds = new Set<string>()
  approvals.forEach((a) => { relatedIds.add(a.from_user); relatedIds.add(a.to_user) })
  rels.forEach((r) => { relatedIds.add(r.user_a); relatedIds.add(r.user_b) })
  trioRows.forEach(({ members }) => members.forEach((m) => relatedIds.add(m.user_id)))
  relatedIds.delete(userId)
  const missing = [...relatedIds].filter((id) => !users[id])
  // Always refresh connected profiles with the fuller row; also pull any not in
  // the discovery pool (e.g. a blocked ex-buddy excluded from discovery).
  const related = await api.profiles.related([...relatedIds])
  related.forEach((r) => { users[r.id] = rowToUser(r) })
  // Anything still missing (shouldn't happen) is simply absent; selectors guard.
  void missing
  state.users = users

  // Approvals → incoming/outgoing/passed all derive from this in selectors.
  state.approvals = approvals.map(rowToApproval)
  state.passedUserIds = approvals
    .filter((a) => a.from_user === userId && a.status === 'passed')
    .map((a) => a.to_user)

  // Relationships and their nested data (fetched in parallel across relationships).
  state.relationships = rels.map(rowToRelationship)
  const relData = await Promise.all(
    rels.map(async (rel) => {
      const [msgs, miles, tl] = await Promise.all([
        api.chat.list(rel.id),
        api.milestones.list(rel.id),
        api.timeline.list(rel.id),
      ])
      return { msgs, miles, tl }
    }),
  )
  relData.forEach(({ msgs, miles, tl }) => {
    state.messages.push(...msgs.map(rowToMessage))
    state.milestones.push(...miles.map(rowToMilestone))
    state.timeline.push(...tl.map(rowToTimeline))
  })

  // Notifications.
  state.notifications = notifs.map(rowToNotification)

  // Trios (active + pending) and their messages (fetched in parallel).
  const trios: BuddyTrioGroup[] = []
  const trioMessages: TrioMessage[] = []
  const trioMsgLists = await Promise.all(
    trioRows.map(({ trio }) => api.trios.messages(trio.id)),
  )
  trioRows.forEach(({ trio, members }, i) => {
    trios.push({
      id: trio.id,
      createdAt: Date.parse(trio.created_at),
      active: trio.active,
      memberIds: members.filter((m) => m.approved).map((m) => m.user_id),
      pendingMemberIds: members.filter((m) => !m.approved).map((m) => m.user_id),
    })
    trioMessages.push(...trioMsgLists[i].map(rowToTrioMessage))
  })
  state.trios = trios
  state.trioMessages = trioMessages

  // Check-ins for me + my active buddies (how everyone's feeling today).
  // Non-fatal: if the checkins table doesn't exist yet (migration 0013 not
  // applied), degrade gracefully instead of bricking the whole app load.
  try {
    const buddyIds = new Set<string>([userId])
    rels.forEach((r) => { buddyIds.add(r.user_a); buddyIds.add(r.user_b) })
    const checkins = await api.checkins.forUsers([...buddyIds])
    state.checkins = checkins.map(rowToCheckin)
  } catch (e) {
    console.error('checkins fetch failed (is migration 0013 applied?)', e)
  }

  // The user's private weight history (for progress recaps). Non-fatal: if the
  // weight_logs table doesn't exist yet (migration 0016 not applied), degrade
  // gracefully instead of bricking the whole app load.
  try {
    const logs = await api.weightLogs.forUser(userId)
    state.weightLogs = logs.map(rowToWeightLog)
  } catch (e) {
    console.error('weight logs fetch failed (is migration 0016 applied?)', e)
  }

  return state
}
