import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { ProfileCard } from '../components/ProfileCard'

export function Matches() {
  const navigate = useNavigate()
  const { suggestions, state, passUser, connectWith, incomingPending, outgoingPending } = useStore()
  const list = suggestions()
  const incoming = incomingPending().length
  const outgoing = outgoingPending().length
  const [justConnected, setJustConnected] = useState<string | null>(null)

  const handleConnect = (userId: string, nickname: string) => {
    connectWith(userId)
    setJustConnected(nickname)
    setTimeout(() => setJustConnected(null), 2600)
  }

  return (
    <div className="screen">
      <TopBar title="Matches" />

      {(incoming > 0 || outgoing > 0) && (
        <div
          className="card list-tap"
          style={{ background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', gap: 12 }}
          onClick={() => navigate('/pending')}
        >
          <span style={{ fontSize: 26 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--primary-ink)' }}>Pending matches</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {incoming > 0 && `${incoming} waiting for your decision`}
              {incoming > 0 && outgoing > 0 && ' · '}
              {outgoing > 0 && `${outgoing} awaiting reply`}
            </div>
          </div>
          <span style={{ color: 'var(--primary-ink)', fontWeight: 800 }}>›</span>
        </div>
      )}

      <div className="banner info" style={{ marginBottom: 16 }}>
        🤝 Matches are always mutual — a buddy space only opens when you <em>both</em> say yes.
      </div>

      {justConnected && (
        <div className="banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', marginBottom: 16 }}>
          ✅ Request sent to {justConnected}. We'll let you know if they connect back!
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <div className="big">🔍</div>
          <h3>No more suggestions right now</h3>
          <p>Check back soon — we're always finding new people on a similar journey.</p>
        </div>
      ) : (
        list.map((s) => {
          const user = state.users[s.userId]
          return (
            <ProfileCard key={s.userId} user={user} highlights={s.highlights}>
              <div className="btn-row">
                <button className="btn secondary" onClick={() => passUser(s.userId)}>
                  Pass
                </button>
                <button className="btn" onClick={() => handleConnect(s.userId, user.profile.nickname)}>
                  I'd like to connect
                </button>
              </div>
            </ProfileCard>
          )
        })
      )}
    </div>
  )
}
