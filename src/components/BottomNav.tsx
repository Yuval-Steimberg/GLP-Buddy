import { NavLink } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Icon, BrandMark, type IconName } from './Icon'

const ITEMS: { to: string; label: string; ico: IconName }[] = [
  { to: '/home', label: 'Home', ico: 'home' },
  { to: '/matches', label: 'Matches', ico: 'users' },
  { to: '/timeline', label: 'Timeline', ico: 'growth' },
  { to: '/chat', label: 'Chat', ico: 'chat' },
  { to: '/profile', label: 'Profile', ico: 'profile' },
]

export function BottomNav() {
  const { incomingPending, activeRelationships } = useStore()
  const incoming = incomingPending().length
  const hasBuddy = activeRelationships().length > 0

  return (
    <nav className="bottom-nav">
      <div className="nav-brand">
        <span className="nb-logo"><BrandMark size={26} /></span>
        <span className="nb-name">GLP Buddy</span>
      </div>
      {ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-ico"><Icon name={it.ico} /></span>
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
