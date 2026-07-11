import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import { BrandMark, BrandWordmark, Icon } from '../components/Icon'

// Real email/password auth for Supabase-backed deployments. Rendered by the
// App shell when VITE_BACKEND=supabase and there is no active session.
export function AuthScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // When set, we show a "check your inbox" card (magic link or email confirmation).
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') {
        const data = await auth.signUp(email, password, nickname || 'New buddy')
        // If email confirmation is required, there's no session yet — tell the
        // user to confirm. Otherwise the App auto-redirects on the new session.
        if (!data.session) {
          setNotice(`We sent a confirmation link to ${email}. Open it to activate your account, then come back and sign in.`)
        }
      } else {
        await auth.signIn(email, password)
        // On success the session fires and the App swaps to the app screens.
      }
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setBusy(false)
    }
  }

  const magic = async () => {
    if (!email) return setError('Enter your email first')
    setBusy(true)
    setError('')
    try {
      await auth.sendMagicLink(email)
      setNotice(`We sent a magic sign-in link to ${email}.`)
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    if (!email) return setError('Enter your email above first, then tap reset.')
    setBusy(true)
    setError('')
    try {
      await auth.resetPassword(email)
      setNotice(`We sent a password-reset link to ${email}. Open it to set a new password.`)
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="landing" style={{ justifyContent: 'flex-start', paddingTop: 'calc(40px + env(safe-area-inset-top))' }}>
      <a className="auth-back" onClick={() => navigate('/')}>← Back to home</a>
      <div className="lp-brand" style={{ alignSelf: 'flex-start', gap: 10, fontSize: 24 }}>
        <BrandMark size={34} /><BrandWordmark size={26} />
      </div>
      <div className="tag" style={{ fontSize: 16, marginTop: 10 }}>
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </div>

      <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
        {notice ? (
          <div className="center">
            <div className="empty-ico" style={{ margin: '0 auto 10px' }}><Icon name="mail" size={28} /></div>
            <h3>Check your inbox</h3>
            <p>{notice}</p>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => { setNotice(null); setMode('signin') }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {mode === 'signup' && (
              <div className="field">
                <label>Nickname</label>
                <input className="input" value={nickname} placeholder="What should buddies call you?" onChange={(e) => setNickname(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" autoComplete="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn" disabled={busy || !email || !password} onClick={submit}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={magic} disabled={busy}>
              Email me a magic link instead
            </button>
            {mode === 'signin' && (
              <p className="center" style={{ margin: '12px 0 0' }}>
                <a onClick={forgot} style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Forgot password?
                </a>
              </p>
            )}
          </>
        )}
      </div>

      {!notice && (
        <p className="muted" style={{ fontSize: 13 }}>
          {mode === 'signin' ? 'New to GLPenPal?' : 'Already have an account?'}{' '}
          <a onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }} style={{ fontWeight: 800, cursor: 'pointer' }}>
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </a>
        </p>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Peer support only. GLPenPal does not provide medical advice.
      </p>
    </div>
  )
}

// Turn raw Supabase/network errors into something a person can act on.
function friendlyAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/load failed|failed to fetch|networkerror|fetch/i.test(msg))
    return "Couldn't reach the server. Check your connection and try again in a moment."
  if (/email not confirmed/i.test(msg))
    return 'Please confirm your email first — open the link we sent to your inbox, then sign in.'
  if (/invalid login credentials/i.test(msg))
    return 'That email or password looks wrong. Try again, or create an account.'
  if (/user already registered/i.test(msg))
    return 'An account with this email already exists — try signing in instead.'
  if (/password should be at least/i.test(msg))
    return 'Password is too short — use at least 6 characters.'
  return msg
}
