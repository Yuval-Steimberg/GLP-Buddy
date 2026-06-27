import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/AppStore'
import { BottomNav } from './components/BottomNav'
import { Landing } from './pages/Landing'
import { Onboarding } from './pages/Onboarding'
import { Safety } from './pages/Safety'
import { AuthScreen } from './auth/AuthScreen'
import { useSession } from './auth/useSession'
import { BrandMark } from './components/Icon'
import { USE_SUPABASE } from './lib/env'

// Code-split the authenticated app + secondary screens so the landing/auth
// path ships a smaller initial bundle.
const Matches = lazy(() => import('./pages/Matches').then((m) => ({ default: m.Matches })))
const Pending = lazy(() => import('./pages/Pending').then((m) => ({ default: m.Pending })))
const BuddyHome = lazy(() => import('./pages/BuddyHome').then((m) => ({ default: m.BuddyHome })))
const ChatList = lazy(() => import('./pages/ChatList').then((m) => ({ default: m.ChatList })))
const Chat = lazy(() => import('./pages/Chat').then((m) => ({ default: m.Chat })))
const Timeline = lazy(() => import('./pages/Timeline').then((m) => ({ default: m.Timeline })))
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const Trio = lazy(() => import('./pages/Trio').then((m) => ({ default: m.Trio })))
const Moderation = lazy(() => import('./pages/Moderation').then((m) => ({ default: m.Moderation })))
const Privacy = lazy(() => import('./pages/legal/Privacy').then((m) => ({ default: m.Privacy })))
const Terms = lazy(() => import('./pages/legal/Terms').then((m) => ({ default: m.Terms })))

const NAV_PATHS = ['/home', '/matches', '/timeline', '/chat', '/profile', '/pending', '/trio', '/notifications']

function Loading() {
  return (
    <div className="empty" style={{ marginTop: 120 }}>
      <div className="empty-ico"><BrandMark size={30} /></div>
      <p>Loading…</p>
    </div>
  )
}

export function App() {
  const { currentUser } = useStore()
  const location = useLocation()
  const session = useSession()

  // Supabase mode: require a real session before anything else.
  if (USE_SUPABASE) {
    if (session.loading) {
      return (
        <div className="app-shell">
          <main className="app-main"><Loading /></main>
        </div>
      )
    }
    if (!session.userId) {
      // Logged-out visitors get the marketing landing first (value before the
      // sign-up form), with auth + legal pages reachable as public routes.
      return (
        <div className="app-shell">
          <main className="app-main">
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/auth" element={<AuthScreen />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/" element={<Landing />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      )
    }
  }

  // Supabase mode: once signed in, wait for the user's profile to hydrate
  // before routing — otherwise we'd flash the landing or push a returning
  // (already-onboarded) user back through onboarding.
  if (USE_SUPABASE && session.userId && !currentUser) {
    return (
      <div className="app-shell">
        <main className="app-main"><Loading /></main>
      </div>
    )
  }

  const onboarded = currentUser?.onboardingComplete
  const safe = currentUser?.acceptedSafety
  const showNav =
    onboarded && safe && NAV_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + '/')) &&
    !location.pathname.startsWith('/chat/')

  return (
    <div className="app-shell">
      {showNav && <BottomNav />}
      <main className="app-main">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route
            path="/"
            element={
              onboarded && safe ? <Navigate to="/home" />
                : currentUser ? <Navigate to={onboarded ? '/safety' : '/onboarding'} />
                : <Landing />
            }
          />
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
          <Route path="/moderation" element={<Guard staff><Moderation /></Guard>} />

          {/* Public legal pages */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      </main>
    </div>
  )
}

function Guard({ children, staff }: { children: React.ReactNode; staff?: boolean }) {
  const { currentUser } = useStore()
  if (!currentUser || !currentUser.onboardingComplete) return <Navigate to="/onboarding" />
  if (!currentUser.acceptedSafety) return <Navigate to="/safety" />
  // Staff-only routes: enforced in Supabase mode (is_staff via RLS); always
  // open in local demo mode so reviewers can see the moderation screen.
  if (staff && USE_SUPABASE && !currentUser.isStaff) return <Navigate to="/home" />
  return <>{children}</>
}
