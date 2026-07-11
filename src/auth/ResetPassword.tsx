import { useState } from 'react'
import { auth } from '../services/api'
import { BrandLogo } from '../components/Icon'

// Shown when the user arrives via a password-reset link (PASSWORD_RECOVERY).
// They set a new password; the recovery session then becomes a normal login.
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (password.length < 6) return setError('Use at least 6 characters.')
    setBusy(true)
    setError('')
    try {
      await auth.updatePassword(password)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your password.')
      setBusy(false)
    }
  }

  return (
    <div className="landing" style={{ justifyContent: 'flex-start', paddingTop: 48 }}>
      <BrandLogo width={220} />
      <h1 style={{ fontSize: 30 }}>Set a new password</h1>
      <div className="tag" style={{ fontSize: 15 }}>Almost there — choose a new password.</div>

      <div className="card" style={{ marginTop: 22, textAlign: 'left' }}>
        <div className="field">
          <label>New password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn" disabled={busy || !password} onClick={submit}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </div>
  )
}
