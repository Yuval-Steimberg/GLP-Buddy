import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import {
  FullMatchProfile,
  MatchDeckCard,
  type SwipeDirection,
} from '../components/MatchDeckCard'

const SWIPE_THRESHOLD = 84
const SWIPE_DURATION = 260

export function Matches() {
  const navigate = useNavigate()
  const {
    suggestions,
    state,
    currentUser,
    passUser,
    connectWith,
    incomingPending,
    outgoingPending,
  } = useStore()
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  // Pointer movement re-renders at animation speed. Keep compatibility scoring
  // and sorting out of that hot path so swiping remains smooth with a full pool.
  const list = useMemo(() => {
    const dismissedSet = new Set(dismissedIds)
    return suggestions().filter((suggestion) => !dismissedSet.has(suggestion.userId))
  }, [dismissedIds, suggestions])
  const incoming = incomingPending().length
  const outgoing = outgoingPending().length
  const [justConnected, setJustConnected] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<SwipeDirection | null>(null)
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  const dragStart = useRef<{ pointerId: number; x: number } | null>(null)
  const moved = useRef(false)
  const swipeTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  const currentSuggestion = list[0]
  const nextSuggestion = list[1]
  const currentMatch = currentSuggestion ? state.users[currentSuggestion.userId] : null
  const nextMatch = nextSuggestion ? state.users[nextSuggestion.userId] : null
  const openSuggestion = openProfileId
    ? list.find((suggestion) => suggestion.userId === openProfileId)
    : undefined
  const openMatch = openSuggestion ? state.users[openSuggestion.userId] : null
  const myInterests = currentUser?.profile.interests ?? []

  useEffect(() => () => {
    if (swipeTimer.current) window.clearTimeout(swipeTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const closeProfile = useCallback(() => setOpenProfileId(null), [])

  const showConnectedToast = (nickname: string) => {
    setJustConnected(nickname)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setJustConnected(null), 3000)
  }

  const completeDecision = (direction: SwipeDirection) => {
    if (!currentSuggestion || !currentMatch || exiting) return
    const userId = currentSuggestion.userId
    const nickname = currentMatch.profile.nickname
    setOpenProfileId(null)
    setExiting(direction)
    setDragging(false)
    setDragX((direction === 'right' ? 1 : -1) * Math.max(window.innerWidth, 720))
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : SWIPE_DURATION
    swipeTimer.current = window.setTimeout(() => {
      setDismissedIds((previous) => previous.includes(userId) ? previous : [...previous, userId])
      if (direction === 'right') {
        connectWith(userId)
        showConnectedToast(nickname)
      } else {
        passUser(userId)
      }
      setExiting(null)
      setDragX(0)
    }, duration)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (exiting || event.button !== 0) return
    dragStart.current = { pointerId: event.pointerId, x: event.clientX }
    moved.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId || exiting) return
    const delta = event.clientX - dragStart.current.x
    if (Math.abs(delta) > 6) moved.current = true
    setDragX(Math.max(-220, Math.min(220, delta)))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return
    const releasedAt = event.clientX - dragStart.current.x
    dragStart.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (Math.abs(releasedAt) >= SWIPE_THRESHOLD) {
      completeDecision(releasedAt > 0 ? 'right' : 'left')
    } else {
      setDragX(0)
    }
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return
    dragStart.current = null
    setDragging(false)
    setDragX(0)
  }

  const handleCardOpen = () => {
    if (!moved.current && !exiting && currentSuggestion) {
      setOpenProfileId(currentSuggestion.userId)
    }
  }

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      completeDecision('left')
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      completeDecision('right')
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardOpen()
    }
  }

  return (
    <div className="screen matches-screen">
      <TopBar title="Matches" />

      {(incoming > 0 || outgoing > 0) && (
        <button className="match-pending" onClick={() => navigate('/pending')}>
          <span className="row-ico"><Icon name="clock" size={20} /></span>
          <span className="match-pending-copy">
            <strong>Pending matches</strong>
            <small>
              {incoming > 0 && `${incoming} waiting for your decision`}
              {incoming > 0 && outgoing > 0 && ' · '}
              {outgoing > 0 && `${outgoing} awaiting reply`}
            </small>
          </span>
          <Icon name="profile" size={18} />
        </button>
      )}

      <div className="match-intro-bar">
        <div>
          <span className="section-kicker">MEANINGFUL MATCHING</span>
          <h1>Find someone who gets this chapter</h1>
          <p>Decide from shared experience, goals and personality—not appearance alone.</p>
        </div>
        {list.length > 0 ? <span className="match-count">{list.length} to review</span> : null}
      </div>

      {justConnected && (
        <div className="match-toast" role="status">
          <Icon name="check" size={17} />
          Interest sent to {justConnected}. We will let you know if it is mutual.
        </div>
      )}

      {!currentSuggestion || !currentMatch ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="search" size={30} /></div>
          <h3>No more suggestions right now</h3>
          <p>Check back soon — we're always finding new people on a similar journey.</p>
        </div>
      ) : (
        <>
          <div className="match-deck-wrap">
            <div className="match-deck" aria-live="polite">
              {nextSuggestion && nextMatch ? (
                <div className="match-deck-card is-next" aria-hidden="true">
                  <div className="match-next-person">
                    <span className="section-kicker">NEXT POTENTIAL BUDDY</span>
                    <strong>{nextMatch.profile.nickname}</strong>
                  </div>
                </div>
              ) : null}
              <MatchDeckCard
                key={currentSuggestion.userId}
                user={currentMatch}
                suggestion={currentSuggestion}
                myInterests={myInterests}
                dragX={dragX}
                dragging={dragging}
                exiting={exiting}
                onOpen={handleCardOpen}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onKeyDown={handleCardKeyDown}
              />
            </div>

            <div className="match-actions" aria-label="Match actions">
              <button
                className="match-action secondary"
                onClick={() => completeDecision('left')}
                disabled={!!exiting}
                aria-label={`Skip ${currentMatch.profile.nickname}`}
              >
                <Icon name="close" size={23} />
                <span>Skip</span>
              </button>
              <button
                className="match-action view"
                onClick={() => setOpenProfileId(currentSuggestion.userId)}
                disabled={!!exiting}
                aria-label={`View ${currentMatch.profile.nickname}'s full profile`}
              >
                <Icon name="profile" size={22} />
                <span>Profile</span>
              </button>
              <button
                className="match-action primary"
                onClick={() => completeDecision('right')}
                disabled={!!exiting}
                aria-label={`Show interest in ${currentMatch.profile.nickname}`}
              >
                <Icon name="heart" size={23} />
                <span>Interested</span>
              </button>
            </div>

            <p className="match-swipe-hint">
              <span><Icon name="close" size={13} /> Swipe left to skip</span>
              <span><Icon name="heart" size={13} /> Swipe right for interested</span>
            </p>
            <p className="match-mutual-note">
              <Icon name="lock" size={14} />
              A private buddy space opens only when interest is mutual.
            </p>
          </div>
        </>
      )}

      {openSuggestion && openMatch ? (
        <FullMatchProfile
          user={openMatch}
          suggestion={openSuggestion}
          myInterests={myInterests}
          onClose={closeProfile}
          onPass={() => completeDecision('left')}
          onConnect={() => completeDecision('right')}
        />
      ) : null}
    </div>
  )
}
