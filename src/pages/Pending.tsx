import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'

export function Pending() {
  const navigate = useNavigate()
  const { incomingPending, outgoingPending, approveIncoming, declineIncoming } = useStore()
  const incoming = incomingPending()
  const outgoing = outgoingPending()

  return (
    <div className="screen">
      <TopBar title="Pending" back />

      <h2 style={{ marginBottom: 4 }}>Needs your decision</h2>
      <p style={{ marginTop: 0 }}>People who approved you — approve back to become buddies.</p>

      {incoming.length === 0 ? (
        <div className="card flat center muted" style={{ padding: 24 }}>
          No one waiting on you right now.
        </div>
      ) : (
        incoming.map((u) => (
          <div className="card" key={u.id}>
            <div className="row">
              <Avatar name={u.profile.nickname} size={48} />
              <div style={{ flex: 1 }}>
                <strong>{u.profile.nickname}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  💊 {u.profile.medication} · {u.profile.treatmentStage}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14 }}>{u.profile.bio}</p>
            <div className="btn-row">
              <button className="btn secondary" onClick={() => declineIncoming(u.id)}>
                Pass
              </button>
              <button className="btn success" onClick={() => approveIncoming(u.id)}>
                Approve buddy
              </button>
            </div>
          </div>
        ))
      )}

      <div className="divider" />

      <h2 style={{ marginBottom: 4 }}>Waiting on them</h2>
      <p style={{ marginTop: 0 }}>You said yes — we'll notify you if they connect back.</p>

      {outgoing.length === 0 ? (
        <div className="card flat center muted" style={{ padding: 24 }}>
          Nothing pending. <button className="btn ghost sm" onClick={() => navigate('/matches')}>Find buddies</button>
        </div>
      ) : (
        outgoing.map((u) => (
          <div className="card" key={u.id}>
            <div className="row">
              <Avatar name={u.profile.nickname} size={44} />
              <div style={{ flex: 1 }}>
                <strong>{u.profile.nickname}</strong>
                <div className="muted" style={{ fontSize: 13 }}>Awaiting their reply…</div>
              </div>
              <span className="chip accent">⏳ Pending</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
