import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/AppStore'
import { BottomNav } from './components/BottomNav'
import { Landing } from './pages/Landing'
import { Onboarding } from './pages/Onboarding'
import { Safety } from './pages/Safety'
import { Matches } from './pages/Matches'
import { Pending } from './pages/Pending'
import { BuddyHome } from './pages/BuddyHome'
import { ChatList } from './pages/ChatList'
import { Chat } from './pages/Chat'
import { Timeline } from './pages/Timeline'
import { Notifications } from './pages/Notifications'
import { Profile } from './pages/Profile'
import { Trio } from './pages/Trio'
import { Privacy } from './pages/legal/Privacy'
import { Terms } from './pages/legal/Terms'
import { Moderation } from './pages/Moderation'
import { AuthScreen } from './auth/AuthScreen'
import { useSession } from './auth/useSession'
import { USE_SUPABASE } from './lib/env'

const NAV_PATHS = ['/home', '/matches', '/timeline', '/chat', '/profile', '/pending', '/trio', '/notifications']

export function App() {
  const { currentUser } = useStore()
  const location = useLocation()
  const session = useSession()

  // Supabase mode: require a real session before anything else.
  if (USE_SUPABASE) {
    if (session.loading) {
      return (
        <div className="app-shell">
          <div className="empty" style={{ marginTop: 120 }}>
            <div className="big">🫂</div>
            <p>Loading…</p>
          </div>
        </div>
      )
    }
    if (!session.userId) {
      return (
        <div className="app-shell">
          <AuthScreen />
        </div>
      )
    }
  }

  const onboarded = currentUser?.onboardingComplete
  const safe = currentUser?.acceptedSafety
  const showNav =
    onboarded && safe && NAV_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + '/')) &&
    !location.pathname.startsWith('/chat/')

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={onboarded && safe ? <Navigate to="/home" /> : <Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/safety"
          element={onboarded ? <Safety /> : <Navigate to="/onboarding" />}
        />

        {/* Authenticated app */}
        <Route path="/home" element={<Guard><BuddyHome /></Guard>} />
        <Route path="/matches" element={<Guard><Matches /></Guard>} />
        <Route path="/pending" element={<Guard><Pending /></Guard>} />
        <Route path="/timeline" element={<Guard><Timeline /></Guard>} />
        <Route path="/chat" element={<Guard><ChatList /></Guard>} />
        <Route path="/chat/:relId" element={<Guard><Chat /></Guard>} />
        <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />
        <Route path="/trio" element={<Guard><Trio /></Guard>} />
        <Route path="/moderation" element={<Guard><Moderation /></Guard>} />

        {/* Public legal pages */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {showNav && <BottomNav />}
    </div>
  )
}

function Guard({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore()
  if (!currentUser || !currentUser.onboardingComplete) return <Navigate to="/onboarding" />
  if (!currentUser.acceptedSafety) return <Navigate to="/safety" />
  return <>{children}</>
}
