import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Icon } from './Icon'

export function TopBar({ title, back }: { title: string; back?: boolean }) {
  const navigate = useNavigate()
  const { unreadCount } = useStore()
  const unread = unreadCount()

  return (
    <div className="topbar">
      {back ? (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
      ) : (
        <span className="title">{title}</span>
      )}
      {back && <span className="title" style={{ fontSize: 18 }}>{title}</span>}
      <div className="spacer" />
      <button
        className="icon-btn"
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="badge-dot">{unread}</span>}
      </button>
    </div>
  )
}
