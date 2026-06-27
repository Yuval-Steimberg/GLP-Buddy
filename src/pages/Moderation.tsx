import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Icon } from '../components/Icon'
import { timeAgo } from '../utils/format'

// Lightweight in-app moderation queue. In the local demo it reads reports from
// the store; in production this view would be gated to staff and query the
// reports_blocks table (a full admin dashboard is the production follow-up).
export function Moderation() {
  const navigate = useNavigate()
  const { state } = useStore()
  const reports = [...state.reports].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="screen no-nav">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <span className="title" style={{ fontSize: 18 }}>Moderation</span>
        <div className="spacer" />
      </div>

      <div className="banner info" style={{ marginBottom: 16 }}>
        Staff-only queue (placeholder). Reports and blocks land here for review.
      </div>

      {reports.length === 0 ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="check" size={30} /></div>
          <h3>Queue is clear</h3>
          <p>No reports or blocks to review.</p>
        </div>
      ) : (
        reports.map((r) => {
          const target = state.users[r.targetUserId]
          return (
            <div className="card" key={r.id}>
              <div className="row between">
                <strong>{r.kind === 'block' ? 'Block' : 'Report'}</strong>
                <span className="muted" style={{ fontSize: 11 }}>{timeAgo(r.createdAt)}</span>
              </div>
              <p style={{ fontSize: 14, marginBottom: 4 }}>
                Target: <strong>{target?.profile.nickname ?? r.targetUserId}</strong>
              </p>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Reason: {r.reason}</p>
              <div className="btn-row">
                <button className="btn secondary sm">Dismiss</button>
                <button className="btn danger sm">Suspend user</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
