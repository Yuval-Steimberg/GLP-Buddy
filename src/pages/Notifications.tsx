import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { timeAgo } from '../utils/format'
import type { NotificationType } from '../types'

const ICON: Record<NotificationType, string> = {
  new_match: '🔍',
  approved_you: '👍',
  match_created: '🤝',
  message: '💬',
  milestone: '🎯',
  goal_reached: '🏆',
  reflection: '📝',
  trio_unlocked: '👥',
}

export function Notifications() {
  const navigate = useNavigate()
  const { state, markAllRead } = useStore()

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  const list = [...state.notifications].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="screen">
      <TopBar title="Notifications" back />

      {list.length === 0 ? (
        <div className="empty">
          <div className="big">🔔</div>
          <h3>You're all caught up</h3>
          <p>New matches, messages and milestones will show up here.</p>
        </div>
      ) : (
        list.map((n) => (
          <div
            key={n.id}
            className={`card list-tap${n.read ? '' : ''}`}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: n.read ? '4px solid transparent' : '4px solid var(--primary)' }}
            onClick={() => n.link && navigate(n.link)}
          >
            <span style={{ fontSize: 24 }}>{ICON[n.type]}</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{n.title}</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{n.body}</p>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
