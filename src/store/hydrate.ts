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
  rowToInjectionLog,
  rowToMeal,
  rowToMessage,
  rowToMilestone,
  rowToNotification,
  rowToRelationship,
  rowToTimeline,
  rowToSymptomLog,
  rowToTrioMessage,
  rowToUser,
  rowToWeightLog,
} from './mappers'

export async function hydrate(
  userId: string,
  onCoreReady?: (state: AppState) => void,
): Promise<AppState> {
  // Only identity, connection, and routing data block the first signed-in
  // paint. Discovery and history can finish after the user is already home.
  const [me, approvals, rels, notifs, trioRows] = await Promise.all([
    api.profiles.get(userId),
    api.matching.allForUser(userId),
    api.relationships.active(userId),
    api.notifications.list(userId),
    api.trios.mine(userId),
  ])

  // Fetch full profiles for everyone the user is connected to (buddies, pending
  // approvals, trio co-members). Profile reads are now scoped to connections
  // (RLS), and these carry authoritative data the minimized discovery rows omit.
  const relatedIds = new Set<string>()
  approvals.forEach((a) => { relatedIds.add(a.from_user); relatedIds.add(a.to_user) })
  rels.forEach((r) => { relatedIds.add(r.user_a); relatedIds.add(r.user_b) })
  trioRows.forEach(({ members }) => members.forEach((m) => relatedIds.add(m.user_id)))
  relatedIds.delete(userId)
  // Once the top-level rows are known, all remaining collections are
  // independent. Start them together, including discovery, so background
  // hydration pays for one network round.
  const candidatesPromise = api.profiles.candidates(userId)
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
  const injectionLogsPromise = api.injectionLogs.forUser(userId).catch((e) => {
    console.error('injection logs fetch failed (is journey tracking migration applied?)', e)
    return []
  })
  const symptomLogsPromise = api.symptomLogs.forUser(userId).catch((e) => {
    console.error('symptom logs fetch failed (is journey tracking migration applied?)', e)
    return []
  })

  // The connected profiles are the only second-wave data required to render
  // relationship cards safely. Publish an immutable core snapshot as soon as
  // they arrive; the provider keeps filling the rest in the background.
  const related = await relatedPromise
  const coreUsers: Record<string, User> = {}
  if (me) coreUsers[me.id] = rowToUser(me)
  related.forEach((r) => { coreUsers[r.id] = rowToUser(r) })

  const trios: BuddyTrioGroup[] = trioRows.map(({ trio, members }) => ({
    id: trio.id,
    createdAt: Date.parse(trio.created_at),
    active: trio.active,
    memberIds: members.filter((m) => m.approved).map((m) => m.user_id),
    pendingMemberIds: members.filter((m) => !m.approved).map((m) => m.user_id),
  }))
  const mappedApprovals = approvals.map(rowToApproval)
  const coreState: AppState = {
    ...buildEmptyState(),
    currentUserId: userId,
    users: coreUsers,
    approvals: mappedApprovals,
    passedUserIds: approvals
      .filter((a) => a.from_user === userId && a.status === 'passed')
      .map((a) => a.to_user),
    relationships: rels.map(rowToRelationship),
    notifications: notifs.map(rowToNotification),
    trios,
  }
  onCoreReady?.(coreState)

  const [
    candidates,
    relData,
    trioMsgLists,
    checkins,
    meals,
    logs,
    goalRows,
    injectionRows,
    symptomRows,
  ] = await Promise.all([
    candidatesPromise,
    relDataPromise,
    trioMsgListsPromise,
    checkinsPromise,
    mealsPromise,
    weightLogsPromise,
    goalsPromise,
    injectionLogsPromise,
    symptomLogsPromise,
  ])

  // Discovery profiles are intentionally absent from the core snapshot. Add
  // them now, then let authoritative signed-in/connected rows override the
  // minimized discovery shape.
  const users: Record<string, User> = {}
  candidates.forEach((c) => { users[c.id] = rowToUser(c) })
  if (me) users[me.id] = rowToUser(me)
  // Always refresh connected profiles with the fuller row; also pull any not in
  // the discovery pool (e.g. a blocked ex-buddy excluded from discovery).
  related.forEach((r) => { users[r.id] = rowToUser(r) })

  // Trios (active + pending) and their messages (fetched in parallel).
  const trioMessages: TrioMessage[] = []
  trioRows.forEach((_, i) => {
    trioMessages.push(...trioMsgLists[i].map(rowToTrioMessage))
  })

  return {
    ...coreState,
    users,
    messages: relData.flatMap(({ msgs }) => msgs.map(rowToMessage)),
    milestones: relData.flatMap(({ miles }) => miles.map(rowToMilestone)),
    timeline: relData.flatMap(({ tl }) => tl.map(rowToTimeline)),
    trioMessages,
    checkins: checkins.map(rowToCheckin),
    meals: meals.map(rowToMeal),
    weightLogs: logs.map(rowToWeightLog),
    goals: goalRows.map(rowToGoal),
    injectionLogs: injectionRows.map(rowToInjectionLog),
    symptomLogs: symptomRows.map(rowToSymptomLog),
  }
}
