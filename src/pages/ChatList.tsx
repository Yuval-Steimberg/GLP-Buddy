import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { timeAgo } from '../utils/format'

export function ChatList() {
  const navigate = useNavigate()
  const { activeRelationships, buddyOf, state, activeTrio } = useStore()
  const rels = activeRelationships()
  const trio = activeTrio()

  return (
    <div className="screen">
      <TopBar title="Chat" />

      {/* The Coach is always available — a wellness companion, not a buddy. */}
      <div
        className="card list-tap"
        style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-2)' }}
        onClick={() => navigate('/coach')}
      >
        <div className="avatar" style={{ width: 50, height: 50, background: 'var(--primary)' }}><Icon name="spark" size={22} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>The Coach</strong>
          <div className="muted" style={{ fontSize: 13 }}>Wellness &amp; motivation · not medical advice</div>
        </div>
        <span style={{ fontWeight: 800, color: 'var(--primary-ink)' }}>›</span>
      </div>

      {rels.length === 0 && !trio ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="chat" size={30} /></div>
          <h3>No conversations yet</h3>
          <p>Match with a buddy to start chatting in a private space.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/matches')}>
            Find my buddy
          </button>
        </div>
      ) : (
        <>
          {rels.map((rel) => {
            const buddy = buddyOf(rel)
            const msgs = state.messages
              .filter((m) => m.relationshipId === rel.id)
              .sort((a, b) => a.createdAt - b.createdAt)
            const last = msgs[msgs.length - 1]
            return (
              <div
                key={rel.id}
                className="card list-tap"
                style={{ display: 'flex', gap: 12, alignItems: 'center' }}
                onClick={() => navigate(`/chat/${rel.id}`)}
              >
                <Avatar name={buddy.profile.nickname} size={50} src={buddy.profile.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between">
                    <strong>{buddy.profile.nickname}</strong>
                    {last && <span className="muted" style={{ fontSize: 11 }}>{timeAgo(last.createdAt)}</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {last ? last.text : 'Say hi'}
                  </div>
                </div>
              </div>
            )
          })}

          {trio && (
            <div
              className="card list-tap"
              style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--primary-soft)' }}
              onClick={() => navigate('/trio')}
            >
              <div className="avatar" style={{ width: 50, height: 50, background: 'var(--primary)' }}><Icon name="users" size={22} /></div>
              <div style={{ flex: 1 }}>
                <strong>Your Buddy Trio</strong>
                <div className="muted" style={{ fontSize: 13 }}>Group chat · 3 members</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
