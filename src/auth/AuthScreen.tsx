import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/api'
import { BrandMark, Icon } from '../components/Icon'

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
  const [magicSent, setMagicSent] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') await auth.signUp(email, password, nickname || 'New buddy')
      else await auth.signIn(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
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
      setMagicSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="landing" style={{ justifyContent: 'flex-start', paddingTop: 40 }}>
      <a className="auth-back" onClick={() => navigate('/')}>← Back to home</a>
      <div className="logo"><BrandMark size={56} /></div>
      <h1 style={{ fontSize: 34 }}>GLPenPal</h1>
      <div className="tag" style={{ fontSize: 16 }}>
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </div>

      <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
        {magicSent ? (
          <div className="center">
            <div className="empty-ico" style={{ margin: '0 auto 10px' }}><Icon name="mail" size={28} /></div>
            <h3>Check your inbox</h3>
            <p>We sent a magic sign-in link to {email}.</p>
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
              <input className="input" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="btn" disabled={busy || !email || !password} onClick={submit}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={magic} disabled={busy}>
              Email me a magic link instead
            </button>
          </>
        )}
      </div>

      {!magicSent && (
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
