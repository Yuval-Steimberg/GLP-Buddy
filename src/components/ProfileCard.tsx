import { useState } from 'react'
import type { User } from '../types'
import { Avatar } from './Avatar'

export function ProfileCard({
  user,
  highlights,
  children,
}: {
  user: User
  highlights?: string[]
  children?: React.ReactNode
}) {
  const p = user.profile
  // Suggestion cards lead with the essentials (who + medication/stage + why you
  // match) so the list is easy to skim; bio and secondary details tuck behind a
  // "More about…" toggle.
  const [showMore, setShowMore] = useState(false)
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Avatar name={p.nickname} size={54} src={p.avatarUrl} />
        <div style={{ flex: 1 }}>
          <div className="row between">
            <h3>{p.nickname}</h3>
            <span className="chip">{p.ageRange}</span>
          </div>
          <div className="chip-row" style={{ marginTop: 8 }}>
            <span className="chip primary">{p.medication}</span>
            <span className="chip">{p.treatmentStage}</span>
          </div>
        </div>
      </div>

      {highlights && highlights.length > 0 && (
        <div className="card flat" style={{ marginTop: 12, marginBottom: 0, background: 'var(--green-soft)', border: 'none' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)', marginBottom: 6 }}>
            Why you might match
          </div>
          <div className="chip-row">
            {highlights.map((h) => (
              <span key={h} className="chip green">{h}</span>
            ))}
          </div>
        </div>
      )}

      {showMore && (
        <>
          <div className="chip-row" style={{ marginTop: 12 }}>
            <span className="chip green">{p.mainGoal}</span>
            <span className="chip">{p.communicationPreference}</span>
          </div>
          {p.bio && <p style={{ marginTop: 12, color: 'var(--ink)' }}>{p.bio}</p>}
        </>
      )}

      <button
        className="more-toggle"
        onClick={() => setShowMore((s) => !s)}
        aria-expanded={showMore}
      >
        {showMore ? 'Show less' : `More about ${p.nickname}`}
        <span className={`expand-caret${showMore ? ' open' : ''}`} aria-hidden>›</span>
      </button>

      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}
