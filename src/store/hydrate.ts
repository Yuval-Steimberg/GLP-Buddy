// Pull a full AppState snapshot for the signed-in user from Supabase.
// Used in Supabase mode on load and after every mutating action (refetch
// semantics keep the cache correct without juggling optimistic client IDs).
import * as api from '../services/api'
import { buildEmptyState } from '../data/mockData'
import type { AppState, BuddyTrioGroup, TrioMessage, User } from '../types'
import {
  rowToApproval,
  rowToCheckin,
  rowToGoal,
  rowToMeal,
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
  // Once the top-level rows are known, all remaining collections are
  // independent. Start them together so login pays for one network round
  // instead of waiting through related profiles → relationship data → trio
  // messages → check-ins → meals → weight logs → goals in sequence.
  const relatedPromise = api.profiles.related([...relatedIds])
  const relDataPromise = Promise.all(
    rels.map(async (rel) => {
      const [msgs, miles, tl] = await Promise.all([
        api.chat.list(rel.id),
        api.milestones.list(rel.id),
        api.timeline.list(rel.id),
      ])
      return { msgs, miles, tl }
    }),
  )
  const trioMsgListsPromise = Promise.all(
    trioRows.map(({ trio }) => api.trios.messages(trio.id)),
  )
  const buddyIds = new Set<string>([userId])
  rels.forEach((r) => { buddyIds.add(r.user_a); buddyIds.add(r.user_b) })
  const checkinsPromise = api.checkins.forUsers([...buddyIds]).catch((e) => {
    console.error('checkins fetch failed (is migration 0013 applied?)', e)
    return []
  })
  const mealsPromise = api.meals.forUser(userId).catch((e) => {
    console.error('meals fetch failed (is migration 0018 applied?)', e)
    return []
  })
  const weightLogsPromise = api.weightLogs.forUser(userId).catch((e) => {
    console.error('weight logs fetch failed (is migration 0016 applied?)', e)
    return []
  })
  const goalsPromise = api.goals.forRelationships(rels.map((r) => r.id)).catch((e) => {
    console.error('goals fetch failed (is migration 0020 applied?)', e)
    return []
  })

  const [
    related,
    relData,
    trioMsgLists,
    checkins,
    meals,
    logs,
    goalRows,
  ] = await Promise.all([
    relatedPromise,
    relDataPromise,
    trioMsgListsPromise,
    checkinsPromise,
    mealsPromise,
    weightLogsPromise,
    goalsPromise,
  ])

  // Always refresh connected profiles with the fuller row; also pull any not in
  // the discovery pool (e.g. a blocked ex-buddy excluded from discovery).
  related.forEach((r) => { users[r.id] = rowToUser(r) })
  state.users = users

  // Approvals → incoming/outgoing/passed all derive from this in selectors.
  state.approvals = approvals.map(rowToApproval)
  state.passedUserIds = approvals
    .filter((a) => a.from_user === userId && a.status === 'passed')
    .map((a) => a.to_user)

  // Relationships and their nested data.
  state.relationships = rels.map(rowToRelationship)
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

  state.checkins = checkins.map(rowToCheckin)
  state.meals = meals.map(rowToMeal)
  state.weightLogs = logs.map(rowToWeightLog)
  state.goals = goalRows.map(rowToGoal)

  return state
}
