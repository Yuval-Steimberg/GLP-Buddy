import { useEffect } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { MatchSuggestion, User } from '../types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

export type SwipeDirection = 'left' | 'right'

interface MatchDeckCardProps {
  user: User
  suggestion: MatchSuggestion
  myInterests: string[]
  dragX: number
  dragging: boolean
  exiting: SwipeDirection | null
  onOpen: () => void
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

function sharedInterests(mine: string[], theirs: string[]) {
  const mySet = new Set(mine.map((interest) => interest.toLowerCase()))
  return theirs.filter((interest) => mySet.has(interest.toLowerCase()))
}

function matchStrength(score: number) {
  if (score >= 75) return 'Excellent fit'
  if (score >= 50) return 'Strong fit'
  if (score >= 30) return 'Good potential'
  return 'New possibility'
}

function stageDuration(stage: User['profile']['treatmentStage']) {
  switch (stage) {
    case 'Considering GLP': return 'Exploring treatment'
    case 'Not started yet': return 'Getting ready to start'
    case 'First injection': return 'Started this week'
    case 'First month': return 'Less than one month'
    default: return stage
  }
}

export function MatchDeckCard({
  user,
  suggestion,
  myInterests,
  dragX,
  dragging,
  exiting,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
}: MatchDeckCardProps) {
  const profile = user.profile
  const shared = sharedInterests(myInterests, profile.interests)
  const direction = dragX < 0 ? 'left' : dragX > 0 ? 'right' : null
  const reveal = Math.min(1, Math.abs(dragX) / 90)
  const style = {
    '--match-drag-x': `${dragX}px`,
    '--match-rotation': `${dragX / 34}deg`,
  } as CSSProperties

  return (
    <article
      className={`match-deck-card is-top${dragging ? ' is-dragging' : ''}${exiting ? ` is-exiting-${exiting}` : ''}`}
      style={style}
      role="button"
      aria-roledescription="swipeable match card"
      tabIndex={0}
      aria-keyshortcuts="ArrowLeft ArrowRight Enter"
      aria-label={`${profile.nickname}, ${matchStrength(suggestion.score)}. Open the full profile, use left arrow to skip, or right arrow to show interest.`}
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <span
        className="match-swipe-stamp pass"
        style={{ opacity: direction === 'left' ? reveal : 0 }}
        aria-hidden="true"
      >
        Skip
      </span>
      <span
        className="match-swipe-stamp connect"
        style={{ opacity: direction === 'right' ? reveal : 0 }}
        aria-hidden="true"
      >
        Interested
      </span>

      <header className="match-card-header">
        <Avatar name={profile.nickname} size={68} src={profile.avatarUrl} />
        <div className="match-card-identity">
          <span className="section-kicker">POTENTIAL GLP BUDDY</span>
          <h2>{profile.nickname}</h2>
          <p>
            {[profile.ageRange, profile.country].filter(Boolean).join(' · ') || 'Profile details available'}
          </p>
        </div>
        <span className="match-strength">
          <Icon name="spark" size={14} />
          {matchStrength(suggestion.score)}
        </span>
      </header>

      <section className="match-why">
        <div className="match-section-heading">
          <span className="match-section-icon"><Icon name="heart" size={17} /></span>
          <div>
            <span className="section-kicker">WHY THIS COULD WORK</span>
            <strong>Shared context before appearance</strong>
          </div>
        </div>
        <div className="match-reason-list">
          {suggestion.highlights.slice(0, 3).map((highlight) => (
            <span key={highlight}><Icon name="check" size={13} />{highlight}</span>
          ))}
          {suggestion.highlights.length === 0 ? (
            <span><Icon name="check" size={13} />A new journey to explore together</span>
          ) : null}
        </div>
      </section>

      <section className="match-journey-grid" aria-label="Medication journey">
        <MatchFact icon="syringe" label="Medication" value={profile.medication} />
        <MatchFact icon="clock" label="Time on medication" value={stageDuration(profile.treatmentStage)} />
        <MatchFact icon="growth" label="Current range" value={profile.currentWeightRange || 'Kept private'} />
        <MatchFact icon="heart" label="Goal range" value={profile.goalWeightRange || 'Kept private'} />
      </section>

      <section className="match-support-row">
        <div>
          <span className="section-kicker">LOOKING FOR</span>
          <strong>{profile.mainGoal}</strong>
        </div>
        <div>
          <span className="section-kicker">CHECK-IN RHYTHM</span>
          <strong>{profile.communicationPreference}</strong>
        </div>
      </section>

      {profile.bio ? (
        <section className="match-intro">
          <span className="section-kicker">A LITTLE ABOUT {profile.nickname.toUpperCase()}</span>
          <p>{profile.bio}</p>
        </section>
      ) : null}

      <section className="match-interests">
        <div className="match-section-heading compact">
          <span className="section-kicker">{shared.length > 0 ? 'SHARED INTERESTS' : 'INTERESTS'}</span>
        </div>
        <div className="chip-row">
          {(shared.length > 0 ? shared : profile.interests).slice(0, 4).map((interest) => (
            <span className={`chip${shared.includes(interest) ? ' green' : ''}`} key={interest}>
              {interest}
            </span>
          ))}
        </div>
      </section>

      <footer className="match-card-footer">
        <Icon name="profile" size={17} />
        Tap to review the complete profile
      </footer>
    </article>
  )
}

function MatchFact({
  icon,
  label,
  value,
}: {
  icon: 'syringe' | 'clock' | 'growth' | 'heart'
  label: string
  value: string
}) {
  return (
    <div className="match-fact">
      <span className="match-fact-icon"><Icon name={icon} size={17} /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

interface FullMatchProfileProps {
  user: User
  suggestion: MatchSuggestion
  myInterests: string[]
  onClose: () => void
  onPass: () => void
  onConnect: () => void
}

export function FullMatchProfile({
  user,
  suggestion,
  myInterests,
  onClose,
  onPass,
  onConnect,
}: FullMatchProfileProps) {
  const profile = user.profile
  const shared = sharedInterests(myInterests, profile.interests)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div
      className="match-profile-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="match-profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-profile-title"
      >
        <header className="match-profile-dialog-head">
          <span className="section-kicker">FULL MATCH PROFILE</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close profile" autoFocus>
            <Icon name="close" size={19} />
          </button>
        </header>

        <div className="match-profile-person">
          <Avatar name={profile.nickname} size={76} src={profile.avatarUrl} />
          <div>
            <h2 id="match-profile-title">{profile.nickname}</h2>
            <p>{[profile.ageRange, profile.country, profile.language].filter(Boolean).join(' · ')}</p>
          </div>
          <span className="match-strength"><Icon name="spark" size={14} />{matchStrength(suggestion.score)}</span>
        </div>

        <section className="match-profile-section emphasized">
          <span className="section-kicker">WHY YOU MAY CONNECT</span>
          <div className="match-reason-list">
            {suggestion.highlights.map((highlight) => (
              <span key={highlight}><Icon name="check" size={13} />{highlight}</span>
            ))}
          </div>
        </section>

        {profile.bio ? (
          <section className="match-profile-section">
            <span className="section-kicker">PERSONAL INTRODUCTION</span>
            <p className="match-profile-bio">{profile.bio}</p>
          </section>
        ) : null}

        <section className="match-profile-section">
          <span className="section-kicker">GLP JOURNEY</span>
          <div className="match-profile-detail-grid">
            <ProfileDetail label="Medication" value={profile.medication} />
            <ProfileDetail label="Time on medication" value={stageDuration(profile.treatmentStage)} />
            <ProfileDetail label="Current range" value={profile.currentWeightRange || 'Kept private'} />
            <ProfileDetail label="Goal range" value={profile.goalWeightRange || 'Kept private'} />
          </div>
          <p className="match-privacy-note">
            <Icon name="lock" size={14} />
            Only matching-profile ranges are shown. Private weight logs are never shared.
          </p>
        </section>

        <section className="match-profile-section">
          <span className="section-kicker">GOALS &amp; LIFESTYLE FIT</span>
          <div className="match-profile-detail-grid">
            <ProfileDetail label="Main support goal" value={profile.mainGoal} />
            <ProfileDetail label="Communication style" value={profile.communicationPreference} />
            <ProfileDetail label="Language" value={profile.language || 'Not specified'} />
            <ProfileDetail label="Location" value={profile.country || 'Not specified'} />
          </div>
        </section>

        <section className="match-profile-section">
          <span className="section-kicker">{shared.length > 0 ? 'SHARED INTERESTS' : 'HOBBIES & INTERESTS'}</span>
          <div className="chip-row match-profile-interests">
            {profile.interests.map((interest) => (
              <span className={`chip${shared.includes(interest) ? ' green' : ''}`} key={interest}>
                {interest}
              </span>
            ))}
          </div>
        </section>

        <footer className="match-profile-actions">
          <button className="match-action secondary" onClick={onPass}>
            <Icon name="close" size={20} />
            Skip
          </button>
          <button className="match-action primary" onClick={onConnect}>
            <Icon name="heart" size={20} />
            Show interest
          </button>
        </footer>
      </section>
    </div>
  )
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="match-profile-detail">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}
