import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  Profile,
  User,
  MatchSuggestion,
  BuddyRelationship,
  AppNotification,
  NotificationType,
  Reaction,
  MilestoneType,
  BuddyTrioGroup,
} from '../types'
import { buildEmptyState, buildInitialState } from '../data/mockData'
import { BUDDY_LEVELS, MAX_BUDDIES, TERMS_VERSION, TRIO_MIN_ACCOUNT_AGE_DAYS } from '../constants'
import { USE_SUPABASE } from '../lib/env'
import * as api from '../services/api'
import { showLocalNotification } from '../lib/push'
import { hydrate } from './hydrate'
import { rowToMessage, rowToNotification } from './mappers'

const STORAGE_KEY = 'glpenpal-state-v1'
const DAY = 24 * 60 * 60 * 1000

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

function load(): AppState {
  // Supabase mode: start empty; real data is hydrated after auth.
  if (USE_SUPABASE) return buildEmptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* ignore */
  }
  return buildInitialState()
}

// ---------------------------------------------------------------------------
// Compatibility scoring used to rank + highlight match suggestions.
// ---------------------------------------------------------------------------
function scoreMatch(me: Profile, other: Profile): { score: number; highlights: string[] } {
  const highlights: string[] = []
  let score = 0

  if (me.medication === other.medication) {
    score += 30
    highlights.push('Same medication')
  }
  if (me.treatmentStage === other.treatmentStage) {
    score += 25
    highlights.push('Same treatment stage')
  }
  if (me.mainGoal === other.mainGoal) {
    score += 20
    highlights.push('Similar goals')
  }
  if (me.communicationPreference === other.communicationPreference) {
    score += 15
    highlights.push('Matching communication style')
  }
  const shared = me.interests.filter((i) =>
    other.interests.map((x) => x.toLowerCase()).includes(i.toLowerCase()),
  )
  if (shared.length > 0) {
    score += shared.length * 8
    highlights.push(`Shared interests: ${shared.slice(0, 3).join(', ')}`)
  }
  if (me.language === other.language) {
    score += 5
  }
  return { score, highlights }
}

interface BuddyLevelStatus {
  key: string
  label: string
  emoji: string
  description: string
  unlocked: boolean
  progressLabel?: string
}

export interface TrioEligibility {
  eligible: boolean
  checks: { label: string; met: boolean }[]
}

interface AppStoreValue {
  state: AppState
  currentUser: User | null
  // onboarding / safety
  completeOnboarding: (profile: Profile) => void
  acceptSafety: () => void
  resetApp: () => void
  // matching
  suggestions: () => MatchSuggestion[]
  passUser: (userId: string) => void
  connectWith: (userId: string) => void
  approveIncoming: (userId: string) => void
  declineIncoming: (userId: string) => void
  outgoingPending: () => User[]
  incomingPending: () => User[]
  // relationships
  activeRelationships: () => BuddyRelationship[]
  buddyOf: (rel: BuddyRelationship) => User
  daysConnected: (rel: BuddyRelationship) => number
  buddyLevels: (rel: BuddyRelationship) => BuddyLevelStatus[]
  endRelationship: (relationshipId: string, reason: string) => void
  // chat
  sendMessage: (relationshipId: string, text: string) => void
  reactToMessage: (messageId: string, reaction: Reaction) => void
  // milestones + timeline
  addMilestone: (relationshipId: string, type: MilestoneType, note: string) => void
  reactToTimeline: (eventId: string, reaction: Reaction) => void
  commentOnTimeline: (relationshipId: string, text: string) => void
  sendEncouragement: (relationshipId: string) => void
  addReflection: (relationshipId: string, text: string) => void
  // notifications
  unreadCount: () => number
  unreadMessages: () => number
  markAllRead: () => void
  markChatRead: (relationshipId: string) => void
  // trust + safety
  reportUser: (userId: string, reason: string) => void
  blockUser: (userId: string) => void
  // buddy trio
  trioEligibility: () => TrioEligibility
  createTrio: (buddyUserIds: string[]) => void
  activeTrio: () => BuddyTrioGroup | null
  pendingTrio: () => BuddyTrioGroup | null
  sendTrioMessage: (trioId: string, text: string) => void
  reactToTrioMessage: (messageId: string, reaction: Reaction) => void
  simulateTrioEligibility: () => void // demo helper
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)

  // Local mode: persist the whole cache to localStorage. (Supabase mode is the
  // source of truth, so we never cache another user's data to disk.)
  useEffect(() => {
    if (USE_SUPABASE) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  // Mirror the unread count onto the installed app's home-screen icon badge
  // (App Badging API — supported by installed PWAs incl. iOS 16.4+).
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    if (!nav.setAppBadge) return
    const unread = state.notifications.filter((n) => !n.read).length
    if (unread > 0) nav.setAppBadge(unread).catch(() => {})
    else nav.clearAppBadge?.().catch(() => {})
  }, [state.notifications])

  // Supabase mode: pull a fresh snapshot for the signed-in user. Called on
  // load, on auth change, and after every mutating action (refetch semantics).
  // Hydrate for a known user id. IMPORTANT: this does only REST calls — it must
  // NOT call any supabase.auth.* method (getUser/getSession), because that
  // deadlocks supabase-js when invoked from inside the onAuthStateChange
  // callback below (the auth lock is already held during the callback).
  const hydrateFor = useCallback(async (userId: string) => {
    try {
      setState(await hydrate(userId))
    } catch (e) {
      console.error('hydrate failed', e)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!USE_SUPABASE) return
    const me = await api.auth.currentUserId()
    if (!me) {
      setState(buildEmptyState())
      return
    }
    await hydrateFor(me)
  }, [hydrateFor])

  // Supabase mode: hydrate on auth changes and subscribe to realtime so a
  // buddy's messages / notifications appear without a manual refresh.
  useEffect(() => {
    if (!USE_SUPABASE) return
    let cleanupRealtime: (() => void) | undefined
    // Track who we're currently hydrated/subscribed for. supabase-js re-fires
    // SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION on tab focus and token
    // refreshes; without this guard every one of those would trigger a full
    // re-hydrate (state replace → the pages visibly re-render several times).
    let subscribedFor: string | null = null
    // No explicit refresh() here: supabase-js fires an INITIAL_SESSION event
    // right after we attach below, which performs the first hydrate. Calling
    // refresh() too would double-load on every mount.
    const unsub = api.auth.onAuthChange((userId) => {
      // Same user as we're already set up for → ignore the repeat event.
      if (userId === subscribedFor) return
      cleanupRealtime?.()
      cleanupRealtime = undefined
      subscribedFor = userId
      if (!userId) {
        setState(buildEmptyState())
        return
      }
      // Use the id the event already gives us — never getUser() here.
      void hydrateFor(userId)
      // New notifications stream in incrementally (bell + badge update with no
      // full reload/flicker). Structural changes (a new match) are picked up by
      // the throttled focus refresh below.
      const unsubNtf = api.notifications.subscribe(userId, (row) => {
        setState((prev) => {
          const n = rowToNotification(row)
          if (prev.notifications.some((x) => x.id === n.id)) return prev
          return { ...prev, notifications: [n, ...prev.notifications] }
        })
      })
      const unsubMsg = api.chat.subscribeAll((row) => {
        let isNew = false
        setState((prev) => {
          const m = rowToMessage(row)
          const i = prev.messages.findIndex((x) => x.id === m.id)
          if (i === -1) {
            isNew = true
            return { ...prev, messages: [...prev.messages, m] }
          }
          const messages = prev.messages.slice()
          messages[i] = m
          return { ...prev, messages }
        })
        // A new message from the buddy that you're not currently looking at →
        // pop an OS notification (works while the app is open/backgrounded).
        if (isNew && row.sender_id !== userId && document.visibilityState !== 'visible') {
          void showLocalNotification('New message', row.text, `/chat/${row.relationship_id}`)
        }
      })
      cleanupRealtime = () => { unsubNtf(); unsubMsg() }
    })
    // When the app returns to the foreground (e.g. tapped a push notification),
    // quietly re-pull fresh data in the background. Throttled so rapid focus/
    // blur events (common on mobile) can't trigger a burst of reloads.
    let lastHydrate = 0
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !subscribedFor) return
      const now = Date.now()
      if (now - lastHydrate < 8000) return
      lastHydrate = now
      void hydrateFor(subscribedFor)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsub()
      cleanupRealtime?.()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [hydrateFor])

  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null

  // ---- helpers -----------------------------------------------------------
  const pushNotification = useCallback(
    (
      draft: AppState,
      type: NotificationType,
      title: string,
      body: string,
      link?: string,
    ): AppState => {
      const n: AppNotification = {
        id: genId('ntf'),
        type,
        title,
        body,
        link,
        read: false,
        createdAt: Date.now(),
      }
      return { ...draft, notifications: [n, ...draft.notifications] }
    },
    [],
  )

  // ---- onboarding --------------------------------------------------------
  const completeOnboarding = useCallback((profile: Profile) => {
    if (USE_SUPABASE) {
      // Flip local state immediately so the router advances to /safety instead
      // of bouncing back to /onboarding while the save is still in flight.
      setState((prev) => {
        const id = prev.currentUserId
        const u = id ? prev.users[id] : null
        if (!id || !u) return prev
        return { ...prev, users: { ...prev.users, [id]: { ...u, profile, onboardingComplete: true } } }
      })
      void (async () => {
        try {
          const me = await api.auth.currentUserId()
          if (!me) return
          await api.profiles.saveOnboarding(me, profile)
          await refresh()
        } catch (e) {
          console.error('saveOnboarding failed', e)
        }
      })()
      return
    }
    setState((prev) => {
      const id = prev.currentUserId ?? genId('me')
      const user: User = {
        id,
        profile,
        createdAt: Date.now(),
        acceptedSafety: false,
        onboardingComplete: true,
        endedRelationshipCount: 0,
      }
      let next: AppState = {
        ...prev,
        currentUserId: id,
        users: { ...prev.users, [id]: user },
      }

      // Seed two incoming approvals so the demo immediately has people who
      // "approved me and need my decision".
      const incomingFrom = ['u_maya', 'u_priya'].filter((u) => prev.users[u])
      const approvals = incomingFrom.map((from) => ({
        id: genId('apr'),
        fromUserId: from,
        toUserId: id,
        createdAt: Date.now(),
        status: 'pending' as const,
      }))
      next = { ...next, approvals: [...next.approvals, ...approvals] }
      next = pushNotification(
        next,
        'new_match',
        'New potential buddies',
        'We found people on a similar GLP journey. Take a look!',
        '/matches',
      )
      incomingFrom.forEach((from) => {
        next = pushNotification(
          next,
          'approved_you',
          `${prev.users[from].profile.nickname} approved your profile`,
          'They would like to connect with you. Approve back to become buddies.',
          '/pending',
        )
      })
      return next
    })
  }, [pushNotification, refresh])

  const acceptSafety = useCallback(() => {
    if (USE_SUPABASE) {
      // Optimistic flip so /matches doesn't bounce back to /safety mid-save.
      setState((prev) => {
        const id = prev.currentUserId
        const u = id ? prev.users[id] : null
        if (!id || !u) return prev
        return { ...prev, users: { ...prev.users, [id]: { ...u, acceptedSafety: true } } }
      })
      void (async () => {
        try {
          const me = await api.auth.currentUserId()
          if (!me) return
          await api.profiles.acceptSafety(me, TERMS_VERSION)
          await refresh()
        } catch (e) {
          console.error('acceptSafety failed', e)
        }
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      const u = prev.users[prev.currentUserId]
      return {
        ...prev,
        users: { ...prev.users, [u.id]: { ...u, acceptedSafety: true } },
      }
    })
  }, [refresh])

  const resetApp = useCallback(() => {
    if (USE_SUPABASE) {
      void api.auth.signOut()
      return
    }
    localStorage.removeItem(STORAGE_KEY)
    setState(buildInitialState())
  }, [])

  // ---- match logic -------------------------------------------------------
  const createMatchInDraft = useCallback(
    (draft: AppState, otherId: string): AppState => {
      const me = draft.currentUserId!
      const rel: BuddyRelationship = {
        id: genId('rel'),
        userIds: [me, otherId],
        createdAt: Date.now(),
        active: true,
        levelKeys: [],
      }
      let next: AppState = { ...draft, relationships: [...draft.relationships, rel] }
      // Welcome moment on the shared timeline.
      next = {
        ...next,
        timeline: [
          {
            id: genId('tl'),
            relationshipId: rel.id,
            type: 'moment',
            authorId: me,
            text: `${draft.users[me].profile.nickname} and ${draft.users[otherId].profile.nickname} are now buddies! Say hi 👋`,
            reactions: [],
            createdAt: Date.now(),
          },
          ...next.timeline,
        ],
      }
      next = pushNotification(
        next,
        'match_created',
        `You're now buddies with ${draft.users[otherId].profile.nickname}!`,
        'Your private buddy space is ready. Send a first message to break the ice.',
        '/home',
      )
      return next
    },
    [pushNotification],
  )

  const connectWith = useCallback(
    (userId: string) => {
      if (USE_SUPABASE) {
        // approve_buddy RPC records the approval and, if mutual, atomically
        // creates the relationship + notifications server-side.
        void (async () => {
          try {
            await api.matching.approveBuddy(userId)
          } catch (e) {
            console.error('approveBuddy failed', e)
          }
          await refresh()
        })()
        return
      }
      setState((prev) => {
        if (!prev.currentUserId) return prev
        const me = prev.currentUserId
        // Already at the buddy limit?
        const activeCount = prev.relationships.filter(
          (r) => r.active && r.userIds.includes(me),
        ).length
        if (activeCount >= MAX_BUDDIES) {
          return pushNotification(
            prev,
            'new_match',
            'Buddy limit reached',
            `You can have up to ${MAX_BUDDIES} active buddies. End one to connect with someone new.`,
          )
        }
        // Did they already approve me? (incoming pending) -> instant match.
        const incoming = prev.approvals.find(
          (a) => a.fromUserId === userId && a.toUserId === me && a.status === 'pending',
        )
        let next: AppState = {
          ...prev,
          approvals: [
            ...prev.approvals,
            {
              id: genId('apr'),
              fromUserId: me,
              toUserId: userId,
              createdAt: Date.now(),
              status: incoming ? 'matched' : 'pending',
            },
          ],
        }
        if (incoming) {
          next = {
            ...next,
            approvals: next.approvals.map((a) =>
              a.id === incoming.id ? { ...a, status: 'matched' } : a,
            ),
          }
          next = createMatchInDraft(next, userId)
        }
        return next
      })

      // If it wasn't an instant match, simulate the other person approving
      // back shortly after — demonstrates the notification + match flow.
      setTimeout(() => {
        setState((prev) => {
          if (!prev.currentUserId) return prev
          const me = prev.currentUserId
          const out = prev.approvals.find(
            (a) => a.fromUserId === me && a.toUserId === userId && a.status === 'pending',
          )
          if (!out) return prev // already matched or passed
          // Respect the buddy limit at resolution time too.
          const activeCount = prev.relationships.filter(
            (r) => r.active && r.userIds.includes(me),
          ).length
          if (activeCount >= MAX_BUDDIES) return prev
          let next: AppState = {
            ...prev,
            approvals: prev.approvals.map((a) =>
              a.id === out.id ? { ...a, status: 'matched' } : a,
            ),
          }
          next = pushNotification(
            next,
            'approved_you',
            `${prev.users[userId].profile.nickname} approved you back`,
            'It is a mutual match!',
            '/home',
          )
          next = createMatchInDraft(next, userId)
          return next
        })
      }, 3500)
    },
    [pushNotification, createMatchInDraft, refresh],
  )

  const approveIncoming = useCallback(
    (userId: string) => {
      if (USE_SUPABASE) {
        void (async () => {
          try {
            await api.matching.approveBuddy(userId)
          } catch (e) {
            console.error('approveBuddy failed', e)
          }
          await refresh()
        })()
        return
      }
      setState((prev) => {
        if (!prev.currentUserId) return prev
        const me = prev.currentUserId
        const activeCount = prev.relationships.filter(
          (r) => r.active && r.userIds.includes(me),
        ).length
        if (activeCount >= MAX_BUDDIES) {
          return pushNotification(
            prev,
            'new_match',
            'Buddy limit reached',
            `You can have up to ${MAX_BUDDIES} active buddies. End one to connect with someone new.`,
          )
        }
        const incoming = prev.approvals.find(
          (a) => a.fromUserId === userId && a.toUserId === me && a.status === 'pending',
        )
        if (!incoming) return prev
        let next: AppState = {
          ...prev,
          approvals: prev.approvals.map((a) =>
            a.id === incoming.id ? { ...a, status: 'matched' } : a,
          ),
        }
        next = createMatchInDraft(next, userId)
        return next
      })
    },
    [pushNotification, createMatchInDraft, refresh],
  )

  const declineIncoming = useCallback((userId: string) => {
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.matching.pass(me, userId)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      const me = prev.currentUserId
      return {
        ...prev,
        approvals: prev.approvals.map((a) =>
          a.fromUserId === userId && a.toUserId === me && a.status === 'pending'
            ? { ...a, status: 'passed' }
            : a,
        ),
        passedUserIds: [...prev.passedUserIds, userId],
      }
    })
  }, [refresh])

  const passUser = useCallback((userId: string) => {
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.matching.pass(me, userId)
        await refresh()
      })()
      return
    }
    setState((prev) => ({
      ...prev,
      passedUserIds: [...new Set([...prev.passedUserIds, userId])],
    }))
  }, [refresh])

  // ---- chat --------------------------------------------------------------
  const sendMessage = useCallback((relationshipId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.chat.send(relationshipId, me, trimmed)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: genId('msg'),
            relationshipId,
            senderId: prev.currentUserId,
            text: trimmed,
            createdAt: Date.now(),
            reactions: [],
          },
        ],
      }
    })
  }, [refresh])

  const reactToMessage = useCallback((messageId: string, reaction: Reaction) => {
    if (USE_SUPABASE) {
      const msg = state.messages.find((m) => m.id === messageId)
      if (!msg) return
      const reactions = msg.reactions.includes(reaction)
        ? msg.reactions.filter((r) => r !== reaction)
        : [...msg.reactions, reaction]
      // Optimistic: show the reaction immediately; realtime/refresh reconciles.
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      }))
      void (async () => {
        try {
          await api.chat.react(messageId, reactions)
        } catch (e) {
          console.error('react failed', e)
          await refresh() // roll back to server truth on failure
        }
      })()
      return
    }
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              reactions: m.reactions.includes(reaction)
                ? m.reactions.filter((r) => r !== reaction)
                : [...m.reactions, reaction],
            }
          : m,
      ),
    }))
  }, [refresh, state.messages])

  // ---- milestones + timeline --------------------------------------------
  const addMilestone = useCallback(
    (relationshipId: string, type: MilestoneType, note: string) => {
      if (USE_SUPABASE) {
        void (async () => {
          const me = await api.auth.currentUserId()
          if (!me) return
          await api.milestones.add(relationshipId, me, type, note)
          await api.timeline.addEvent(
            relationshipId,
            me,
            'milestone',
            note ? `${type} — ${note}` : type,
          )
          // Milestone-driven buddy-level unlocks (the buddy's "milestone added"
          // notification is created server-side by a DB trigger).
          const rel = state.relationships.find((r) => r.id === relationshipId)
          if (rel) {
            const newLevels: string[] = []
            if (type === 'Overcame plateau' && !rel.levelKeys.includes('plateau')) newLevels.push('plateau')
            if (type === 'Reached goal weight' && !rel.levelKeys.includes('goal_reached')) newLevels.push('goal_reached')
            if (newLevels.length) {
              await api.relationships.setLevels(relationshipId, [...rel.levelKeys, ...newLevels])
              for (const key of newLevels) {
                const lvl = BUDDY_LEVELS.find((l) => l.key === key)!
                await api.timeline.addEvent(relationshipId, me, 'level', `Buddy level unlocked: ${lvl.emoji} ${lvl.label}`)
              }
            }
          }
          await refresh()
        })()
        return
      }
      setState((prev) => {
        if (!prev.currentUserId) return prev
        const me = prev.currentUserId
        const rel = prev.relationships.find((r) => r.id === relationshipId)
        if (!rel) return prev
        const buddyId = rel.userIds.find((u) => u !== me)!
        const mid = genId('ms')
        let next: AppState = {
          ...prev,
          milestones: [
            ...prev.milestones,
            { id: mid, relationshipId, authorId: me, type, note, createdAt: Date.now() },
          ],
          timeline: [
            {
              id: genId('tl'),
              relationshipId,
              type: 'milestone',
              authorId: me,
              text: note ? `${type} — ${note}` : type,
              refId: mid,
              reactions: [],
              createdAt: Date.now(),
            },
            ...prev.timeline,
          ],
        }
        // Notify the buddy.
        next = pushNotification(
          next,
          type === 'Reached goal weight' ? 'goal_reached' : 'milestone',
          `${prev.users[me].profile.nickname} added a milestone`,
          type === 'Reached goal weight'
            ? `${prev.users[me].profile.nickname} reached their goal weight!`
            : `${type}. React or leave a comment to cheer them on.`,
          '/timeline',
        )
        // Buddy-level unlocks tied to milestone content.
        const newLevels: string[] = []
        if (type === 'Overcame plateau' && !rel.levelKeys.includes('plateau')) {
          newLevels.push('plateau')
        }
        if (type === 'Reached goal weight' && !rel.levelKeys.includes('goal_reached')) {
          newLevels.push('goal_reached')
        }
        if (newLevels.length) {
          next = {
            ...next,
            relationships: next.relationships.map((r) =>
              r.id === relationshipId
                ? { ...r, levelKeys: [...r.levelKeys, ...newLevels] }
                : r,
            ),
          }
          newLevels.forEach((key) => {
            const lvl = BUDDY_LEVELS.find((l) => l.key === key)!
            next = {
              ...next,
              timeline: [
                {
                  id: genId('tl'),
                  relationshipId,
                  type: 'level',
                  authorId: me,
                  text: `Buddy level unlocked: ${lvl.emoji} ${lvl.label}`,
                  reactions: [],
                  createdAt: Date.now(),
                },
                ...next.timeline,
              ],
            }
          })
        }
        // (buddyId referenced so eslint noUnusedLocals stays happy.)
        void buddyId
        return next
      })
    },
    [pushNotification, refresh, state.relationships],
  )

  const reactToTimeline = useCallback((eventId: string, reaction: Reaction) => {
    if (USE_SUPABASE) {
      void (async () => {
        const ev = state.timeline.find((e) => e.id === eventId)
        if (!ev) return
        const reactions = ev.reactions.includes(reaction)
          ? ev.reactions.filter((r) => r !== reaction)
          : [...ev.reactions, reaction]
        await api.timeline.react(eventId, reactions)
        await refresh()
      })()
      return
    }
    setState((prev) => ({
      ...prev,
      timeline: prev.timeline.map((e) =>
        e.id === eventId
          ? {
              ...e,
              reactions: e.reactions.includes(reaction)
                ? e.reactions.filter((r) => r !== reaction)
                : [...e.reactions, reaction],
            }
          : e,
      ),
    }))
  }, [refresh, state.timeline])

  const commentOnTimeline = useCallback((relationshipId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.timeline.addEvent(relationshipId, me, 'comment', trimmed)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      return {
        ...prev,
        timeline: [
          {
            id: genId('tl'),
            relationshipId,
            type: 'comment',
            authorId: prev.currentUserId,
            text: trimmed,
            reactions: [],
            createdAt: Date.now(),
          },
          ...prev.timeline,
        ],
      }
    })
  }, [refresh])

  const sendEncouragement = useCallback((relationshipId: string) => {
    const messages = [
      'You\'ve got this 💪',
      'Proud of you for showing up today 🌟',
      'One day at a time — I\'m here with you 🤗',
      'Sending you good energy today ❤️',
      'However today goes, you\'re doing great 🎉',
    ]
    const text = messages[Math.floor(Math.random() * messages.length)]
    if (USE_SUPABASE) {
      // Send as a real chat message; it shows in the chat via realtime, and the
      // Home screen confirms with a banner. Guarded so a failure can't become
      // an unhandled rejection (Sentry).
      void (async () => {
        try {
          const uid = await api.auth.currentUserId()
          if (uid) await api.chat.send(relationshipId, uid, text)
        } catch (e) {
          console.error('sendEncouragement failed', e)
        }
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: genId('msg'),
            relationshipId,
            senderId: prev.currentUserId,
            text,
            createdAt: Date.now(),
            reactions: [],
          },
        ],
      }
    })
  }, [refresh])

  const addReflection = useCallback((relationshipId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.timeline.addEvent(relationshipId, me, 'reflection', trimmed)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      return {
        ...prev,
        timeline: [
          {
            id: genId('tl'),
            relationshipId,
            type: 'reflection',
            authorId: prev.currentUserId,
            text: trimmed,
            reactions: [],
            createdAt: Date.now(),
          },
          ...prev.timeline,
        ],
      }
    })
  }, [refresh])

  // ---- notifications -----------------------------------------------------
  const markAllRead = useCallback(() => {
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.notifications.markAllRead(me)
        await refresh()
      })()
      return
    }
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }))
  }, [refresh])

  // Opening a chat clears its message notifications (so the Chat tab's unread
  // dot goes away once you've actually read the messages).
  const markChatRead = useCallback((relationshipId: string) => {
    const link = `/chat/${relationshipId}`
    setState((prev) => {
      if (!prev.notifications.some((n) => n.link === link && !n.read)) return prev
      return {
        ...prev,
        notifications: prev.notifications.map((n) => (n.link === link ? { ...n, read: true } : n)),
      }
    })
    // Dismiss any OS notifications already shown for this chat (tag = link).
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then((reg) => reg.getNotifications({ tag: link }))
        .then((ns) => ns.forEach((n) => n.close()))
        .catch(() => {})
    }
    if (USE_SUPABASE) {
      void (async () => {
        try {
          const me = await api.auth.currentUserId()
          if (me) await api.notifications.markReadByLink(me, link)
        } catch (e) {
          console.error('markChatRead failed', e)
        }
      })()
    }
  }, [])

  // ---- trust + safety ----------------------------------------------------
  const reportUser = useCallback((userId: string, reason: string) => {
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.safety.report(me, userId, reason)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      return {
        ...prev,
        reports: [
          ...prev.reports,
          {
            id: genId('rpt'),
            reporterId: prev.currentUserId,
            targetUserId: userId,
            kind: 'report',
            reason,
            createdAt: Date.now(),
          },
        ],
      }
    })
  }, [refresh])

  const blockUser = useCallback((userId: string) => {
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (!me) return
        await api.safety.block(me, userId)
        await api.matching.pass(me, userId)
        const rel = state.relationships.find(
          (r) => r.active && r.userIds.includes(userId) && r.userIds.includes(me),
        )
        if (rel) await api.relationships.end(rel.id, 'Blocked')
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      const me = prev.currentUserId
      return {
        ...prev,
        reports: [
          ...prev.reports,
          {
            id: genId('blk'),
            reporterId: me,
            targetUserId: userId,
            kind: 'block',
            reason: 'Blocked by user',
            createdAt: Date.now(),
          },
        ],
        // End any active relationship with the blocked user.
        relationships: prev.relationships.map((r) =>
          r.active && r.userIds.includes(userId) && r.userIds.includes(me)
            ? { ...r, active: false, endReason: 'Blocked' }
            : r,
        ),
        passedUserIds: [...new Set([...prev.passedUserIds, userId])],
      }
    })
  }, [refresh, state.relationships])

  const endRelationship = useCallback((relationshipId: string, reason: string) => {
    if (USE_SUPABASE) {
      void (async () => {
        await api.relationships.end(relationshipId, reason)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      const u = prev.users[prev.currentUserId]
      const rel = prev.relationships.find((r) => r.id === relationshipId)
      const otherId = rel?.userIds.find((id) => id !== u.id)
      return {
        ...prev,
        relationships: prev.relationships.map((r) =>
          r.id === relationshipId ? { ...r, active: false, endReason: reason } : r,
        ),
        users: {
          ...prev.users,
          [u.id]: { ...u, endedRelationshipCount: u.endedRelationshipCount + 1 },
        },
        // Allow re-suggesting / fresh start: forget the pass on the ex-buddy.
        passedUserIds: prev.passedUserIds.filter((id) => id !== otherId),
      }
    })
  }, [refresh])

  // ---- buddy trio --------------------------------------------------------
  const trioEligibility = useCallback((): TrioEligibility => {
    if (!currentUser) return { eligible: false, checks: [] }
    const accountAgeDays = (Date.now() - currentUser.createdAt) / DAY
    const myActive = state.relationships.filter(
      (r) => r.active && r.userIds.includes(currentUser.id),
    )
    const hasStable = myActive.some(
      (r) => (Date.now() - r.createdAt) / DAY >= 14,
    )
    // "Consistent engagement": has sent some messages or logged milestones.
    const engaged =
      state.messages.some((m) => m.senderId === currentUser.id) ||
      state.milestones.some((m) => m.authorId === currentUser.id)
    const notSwitcher = currentUser.endedRelationshipCount <= 1
    const checks = [
      {
        label: `Active for at least ${TRIO_MIN_ACCOUNT_AGE_DAYS} days`,
        met: accountAgeDays >= TRIO_MIN_ACCOUNT_AGE_DAYS,
      },
      { label: 'Maintained a stable buddy relationship', met: hasStable },
      { label: 'Has not frequently switched buddies', met: notSwitcher },
      { label: 'Consistent engagement', met: engaged },
    ]
    return { eligible: checks.every((c) => c.met), checks }
  }, [currentUser, state.relationships, state.messages, state.milestones])

  const createTrio = useCallback(
    (buddyUserIds: string[]) => {
      if (buddyUserIds.length !== 2) return
      if (USE_SUPABASE) {
        void (async () => {
          const me = await api.auth.currentUserId()
          if (me) await api.trios.create(me, buddyUserIds)
          await refresh()
        })()
        return
      }
      setState((prev) => {
        if (!prev.currentUserId) return prev
        const me = prev.currentUserId
        const trio: BuddyTrioGroup = {
          id: genId('trio'),
          memberIds: [me],
          pendingMemberIds: [...buddyUserIds],
          createdAt: Date.now(),
          active: false,
        }
        return { ...prev, trios: [...prev.trios, trio] }
      })
      // Simulate both invited buddies approving.
      setTimeout(() => {
        setState((prev) => {
          const trio = prev.trios.find(
            (t) => !t.active && t.pendingMemberIds.length > 0,
          )
          if (!trio) return prev
          let next: AppState = {
            ...prev,
            trios: prev.trios.map((t) =>
              t.id === trio.id
                ? {
                    ...t,
                    active: true,
                    memberIds: [...t.memberIds, ...t.pendingMemberIds],
                    pendingMemberIds: [],
                  }
                : t,
            ),
          }
          next = pushNotification(
            next,
            'trio_unlocked',
            'Your Buddy Trio is ready! 🎉',
            'All three members approved. Your shared Trio space is now open.',
            '/trio',
          )
          return next
        })
      }, 3000)
    },
    [pushNotification, refresh],
  )

  const sendTrioMessage = useCallback((trioId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (USE_SUPABASE) {
      void (async () => {
        const me = await api.auth.currentUserId()
        if (me) await api.trios.send(trioId, me, trimmed)
        await refresh()
      })()
      return
    }
    setState((prev) => {
      if (!prev.currentUserId) return prev
      return {
        ...prev,
        trioMessages: [
          ...prev.trioMessages,
          {
            id: genId('tmsg'),
            trioId,
            senderId: prev.currentUserId,
            text: trimmed,
            createdAt: Date.now(),
            reactions: [],
          },
        ],
      }
    })
  }, [refresh])

  const reactToTrioMessage = useCallback((messageId: string, reaction: Reaction) => {
    if (USE_SUPABASE) {
      void (async () => {
        const msg = state.trioMessages.find((m) => m.id === messageId)
        if (!msg) return
        const reactions = msg.reactions.includes(reaction)
          ? msg.reactions.filter((r) => r !== reaction)
          : [...msg.reactions, reaction]
        await api.trios.reactToMessage(messageId, reactions)
        await refresh()
      })()
      return
    }
    setState((prev) => ({
      ...prev,
      trioMessages: prev.trioMessages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              reactions: m.reactions.includes(reaction)
                ? m.reactions.filter((r) => r !== reaction)
                : [...m.reactions, reaction],
            }
          : m,
      ),
    }))
  }, [refresh, state.trioMessages])

  // Demo helper: backdate the account + an active relationship so reviewers
  // can experience the unlocked Buddy Trio flow without waiting 90 days.
  const simulateTrioEligibility = useCallback(() => {
    setState((prev) => {
      if (!prev.currentUserId) return prev
      const me = prev.users[prev.currentUserId]
      return {
        ...prev,
        users: {
          ...prev.users,
          [me.id]: { ...me, createdAt: Date.now() - 100 * DAY, endedRelationshipCount: 0 },
        },
        relationships: prev.relationships.map((r) =>
          r.active && r.userIds.includes(me.id)
            ? { ...r, createdAt: Date.now() - 30 * DAY }
            : r,
        ),
      }
    })
  }, [])

  // ---- selectors ---------------------------------------------------------
  const suggestions = useCallback((): MatchSuggestion[] => {
    if (!currentUser) return []
    const me = currentUser
    const myActiveIds = new Set(
      state.relationships
        .filter((r) => r.active && r.userIds.includes(me.id))
        .flatMap((r) => r.userIds),
    )
    const blockedIds = new Set(
      state.reports.filter((r) => r.kind === 'block').map((r) => r.targetUserId),
    )
    // People I've already sent an outgoing approval to (waiting / matched).
    const outgoingIds = new Set(
      state.approvals.filter((a) => a.fromUserId === me.id).map((a) => a.toUserId),
    )
    return Object.values(state.users)
      .filter((u) => u.id !== me.id)
      .filter((u) => !state.passedUserIds.includes(u.id))
      .filter((u) => !myActiveIds.has(u.id))
      .filter((u) => !blockedIds.has(u.id))
      .filter((u) => !outgoingIds.has(u.id))
      .filter((u) => {
        // Respect the user's gender preference for their buddy.
        if (me.profile.genderPreference === 'Same gender') {
          return u.profile.gender === me.profile.gender
        }
        return true
      })
      .map((u) => {
        const { score, highlights } = scoreMatch(me.profile, u.profile)
        return { userId: u.id, score, highlights }
      })
      .sort((a, b) => b.score - a.score)
  }, [currentUser, state.users, state.passedUserIds, state.relationships, state.reports, state.approvals])

  const outgoingPending = useCallback((): User[] => {
    if (!currentUser) return []
    return state.approvals
      .filter((a) => a.fromUserId === currentUser.id && a.status === 'pending')
      .map((a) => state.users[a.toUserId])
      .filter(Boolean)
  }, [currentUser, state.approvals, state.users])

  const incomingPending = useCallback((): User[] => {
    if (!currentUser) return []
    return state.approvals
      .filter((a) => a.toUserId === currentUser.id && a.status === 'pending')
      .map((a) => state.users[a.fromUserId])
      .filter(Boolean)
  }, [currentUser, state.approvals, state.users])

  const activeRelationships = useCallback((): BuddyRelationship[] => {
    if (!currentUser) return []
    return state.relationships.filter(
      (r) => r.active && r.userIds.includes(currentUser.id),
    )
  }, [currentUser, state.relationships])

  const buddyOf = useCallback(
    (rel: BuddyRelationship): User => {
      const otherId = rel.userIds.find((id) => id !== currentUser?.id)!
      return state.users[otherId]
    },
    [currentUser, state.users],
  )

  const daysConnected = useCallback((rel: BuddyRelationship): number => {
    return Math.max(0, Math.floor((Date.now() - rel.createdAt) / DAY))
  }, [])

  const buddyLevels = useCallback(
    (rel: BuddyRelationship): BuddyLevelStatus[] => {
      const days = Math.floor((Date.now() - rel.createdAt) / DAY)
      return BUDDY_LEVELS.map((lvl) => {
        let unlocked = rel.levelKeys.includes(lvl.key)
        let progressLabel: string | undefined
        if (lvl.key === 'first_week') {
          unlocked = unlocked || days >= 7
          if (!unlocked) progressLabel = `${7 - days} days to go`
        } else if (lvl.key === 'first_month') {
          unlocked = unlocked || days >= 30
          if (!unlocked) progressLabel = `${30 - days} days to go`
        } else if (lvl.key === 'hundred_days') {
          unlocked = unlocked || days >= 100
          if (!unlocked) progressLabel = `${100 - days} days to go`
        } else if (lvl.key === 'plateau') {
          if (!unlocked) progressLabel = 'Log an "Overcame plateau" milestone'
        } else if (lvl.key === 'goal_reached') {
          if (!unlocked) progressLabel = 'Log a "Reached goal weight" milestone'
        }
        return { ...lvl, unlocked, progressLabel }
      })
    },
    [],
  )

  const unreadCount = useCallback(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  )

  // Unread message notifications only — drives the Chat tab's dot.
  const unreadMessages = useCallback(
    () => state.notifications.filter((n) => !n.read && n.type === 'message').length,
    [state.notifications],
  )

  const activeTrio = useCallback((): BuddyTrioGroup | null => {
    if (!currentUser) return null
    return (
      state.trios.find((t) => t.active && t.memberIds.includes(currentUser.id)) ?? null
    )
  }, [currentUser, state.trios])

  const pendingTrio = useCallback((): BuddyTrioGroup | null => {
    if (!currentUser) return null
    return (
      state.trios.find((t) => !t.active && t.memberIds.includes(currentUser.id)) ?? null
    )
  }, [currentUser, state.trios])

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      currentUser,
      completeOnboarding,
      acceptSafety,
      resetApp,
      suggestions,
      passUser,
      connectWith,
      approveIncoming,
      declineIncoming,
      outgoingPending,
      incomingPending,
      activeRelationships,
      buddyOf,
      daysConnected,
      buddyLevels,
      endRelationship,
      sendMessage,
      reactToMessage,
      addMilestone,
      reactToTimeline,
      commentOnTimeline,
      sendEncouragement,
      addReflection,
      unreadCount,
      unreadMessages,
      markAllRead,
      markChatRead,
      reportUser,
      blockUser,
      trioEligibility,
      createTrio,
      activeTrio,
      pendingTrio,
      sendTrioMessage,
      reactToTrioMessage,
      simulateTrioEligibility,
    }),
    [
      state,
      currentUser,
      completeOnboarding,
      acceptSafety,
      resetApp,
      suggestions,
      passUser,
      connectWith,
      approveIncoming,
      declineIncoming,
      outgoingPending,
      incomingPending,
      activeRelationships,
      buddyOf,
      daysConnected,
      buddyLevels,
      endRelationship,
      sendMessage,
      reactToMessage,
      addMilestone,
      reactToTimeline,
      commentOnTimeline,
      sendEncouragement,
      addReflection,
      unreadCount,
      unreadMessages,
      markAllRead,
      markChatRead,
      reportUser,
      blockUser,
      trioEligibility,
      createTrio,
      activeTrio,
      pendingTrio,
      sendTrioMessage,
      reactToTrioMessage,
      simulateTrioEligibility,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useStore must be used within AppStoreProvider')
  return ctx
}
