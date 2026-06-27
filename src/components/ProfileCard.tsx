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
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Avatar name={p.nickname} size={54} />
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

      <div className="chip-row" style={{ marginTop: 12 }}>
        <span className="chip green">{p.mainGoal}</span>
        <span className="chip">{p.communicationPreference}</span>
      </div>

      <p style={{ marginTop: 12, color: 'var(--ink)' }}>{p.bio}</p>

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

      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}
