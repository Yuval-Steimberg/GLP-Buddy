import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/AppStore'
import { BottomNav } from './components/BottomNav'
import { Landing } from './pages/Landing'
import { Onboarding } from './pages/Onboarding'
import { Safety } from './pages/Safety'
import { AuthScreen } from './auth/AuthScreen'
import { ResetPassword } from './auth/ResetPassword'
import { useSession } from './auth/useSession'
import { auth } from './services/api'
import { BrandMark } from './components/Icon'
import { USE_SUPABASE } from './lib/env'

// Code-split the authenticated app + secondary screens so the landing/auth
// path ships a smaller initial bundle.
//
// After a new deploy, an old cached shell may try to load a chunk whose hashed
// filename no longer exists; the server returns index.html and the browser
// throws "'text/html' is not a valid JavaScript MIME type". When that happens
// we reload once to pull the fresh build (guarded so we never loop).
function lazyWithReload<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      const key = 'glp-chunk-reload'
      const last = Number(sessionStorage.getItem(key) || 0)
      // Only auto-reload once per 10s to recover from a stale chunk.
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(key, String(Date.now()))
        window.location.reload()
        return { default: (() => null) as unknown as T }
      }
      throw err
    }
  })
}

// Import thunks kept in one place so we can also PREFETCH them on idle — once
// the chunks are warmed, moving between pages is instant (no Suspense spinner).
const imports = {
  Matches: () => import('./pages/Matches').then((m) => ({ default: m.Matches })),
  Pending: () => import('./pages/Pending').then((m) => ({ default: m.Pending })),
  BuddyHome: () => import('./pages/BuddyHome').then((m) => ({ default: m.BuddyHome })),
  ChatList: () => import('./pages/ChatList').then((m) => ({ default: m.ChatList })),
  Chat: () => import('./pages/Chat').then((m) => ({ default: m.Chat })),
  Timeline: () => import('./pages/Timeline').then((m) => ({ default: m.Timeline })),
  Notifications: () => import('./pages/Notifications').then((m) => ({ default: m.Notifications })),
  Profile: () => import('./pages/Profile').then((m) => ({ default: m.Profile })),
  EditProfile: () => import('./pages/EditProfile').then((m) => ({ default: m.EditProfile })),
  Trio: () => import('./pages/Trio').then((m) => ({ default: m.Trio })),
  Capsule: () => import('./pages/Capsule').then((m) => ({ default: m.Capsule })),
  Moderation: () => import('./pages/Moderation').then((m) => ({ default: m.Moderation })),
  Privacy: () => import('./pages/legal/Privacy').then((m) => ({ default: m.Privacy })),
  Terms: () => import('./pages/legal/Terms').then((m) => ({ default: m.Terms })),
}

let prefetched = false
function prefetchPages() {
  if (prefetched) return
  prefetched = true
  const run = () => Object.values(imports).forEach((fn) => { fn().catch(() => {}) })
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  if (ric) ric(run)
  else setTimeout(run, 1200)
}

const Matches = lazyWithReload(imports.Matches)
const Pending = lazyWithReload(imports.Pending)
const BuddyHome = lazyWithReload(imports.BuddyHome)
const ChatList = lazyWithReload(imports.ChatList)
const Chat = lazyWithReload(imports.Chat)
const Timeline = lazyWithReload(imports.Timeline)
const Notifications = lazyWithReload(imports.Notifications)
const Profile = lazyWithReload(imports.Profile)
const EditProfile = lazyWithReload(imports.EditProfile)
const Trio = lazyWithReload(imports.Trio)
const Capsule = lazyWithReload(imports.Capsule)
const Moderation = lazyWithReload(imports.Moderation)
const Privacy = lazyWithReload(imports.Privacy)
const Terms = lazyWithReload(imports.Terms)

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
  const [recovering, setRecovering] = useState(false)

  // Warm all route chunks once, during idle time after first paint, so
  // navigating between pages doesn't show a loading spinner.
  useEffect(() => { prefetchPages() }, [])

  // Password-reset links arrive as a PASSWORD_RECOVERY auth event — show the
  // "set new password" screen over everything until it's done.
  useEffect(() => {
    if (!USE_SUPABASE) return
    return auth.onPasswordRecovery(() => setRecovering(true))
  }, [])

  if (USE_SUPABASE && recovering) {
    return (
      <div className="app-shell">
        <main className="app-main"><ResetPassword onDone={() => setRecovering(false)} /></main>
      </div>
    )
  }

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
          <Route
            path="/onboarding"
            element={onboarded ? <Navigate to={safe ? '/home' : '/safety'} /> : <Onboarding />}
          />
          <Route
            path="/safety"
            element={!onboarded ? <Navigate to="/onboarding" /> : safe ? <Navigate to="/home" /> : <Safety />}
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
          <Route path="/edit-profile" element={<Guard><EditProfile /></Guard>} />
          <Route path="/trio" element={<Guard><Trio /></Guard>} />
          <Route path="/capsule" element={<Guard><Capsule /></Guard>} />
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
