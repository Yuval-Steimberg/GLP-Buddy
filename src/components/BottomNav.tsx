import { NavLink } from 'react-router-dom'
import { useStore } from '../store/AppStore'

const ITEMS = [
  { to: '/home', label: 'Home', ico: '🏠' },
  { to: '/matches', label: 'Matches', ico: '🤝' },
  { to: '/timeline', label: 'Timeline', ico: '🌱' },
  { to: '/chat', label: 'Chat', ico: '💬' },
  { to: '/profile', label: 'Profile', ico: '🙂' },
]

export function BottomNav() {
  const { incomingPending, activeRelationships } = useStore()
  const incoming = incomingPending().length
  const hasBuddy = activeRelationships().length > 0

  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-ico">{it.ico}</span>
          <span>{it.label}</span>
          {it.to === '/matches' && incoming > 0 && (
            <span className="nav-badge">{incoming}</span>
          )}
          {it.to === '/chat' && hasBuddy && <span className="nav-badge">•</span>}
        </NavLink>
      ))}
    </nav>
  )
}
