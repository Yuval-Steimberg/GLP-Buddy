import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Icon } from '../components/Icon'

export function Safety() {
  const navigate = useNavigate()
  const { acceptSafety } = useStore()
  const [understood, setUnderstood] = useState(false)
  const [adult, setAdult] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)

  const ready = understood && adult && agreedTerms

  const accept = () => {
    if (!ready) return
    acceptSafety()
    navigate('/matches')
  }

  return (
    <div className="screen no-nav">
      <div className="center" style={{ marginTop: 12 }}>
        <div className="empty-ico" style={{ margin: '0 auto 6px' }}><Icon name="shield" size={30} /></div>
        <h1>Before you start</h1>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p style={{ color: 'var(--ink)', fontWeight: 600 }}>
          <strong>GLPenPal is a peer-support platform and does not provide medical
          advice.</strong>
        </p>
        <p>
          Users should not advise each other about dosing, medication changes,
          stopping medication, or urgent symptoms.
        </p>
        <p>
          For medical questions or concerning symptoms, users should contact a
          clinician.
        </p>
      </div>

      <div className="banner warn" style={{ marginBottom: 18 }}>
        If you're experiencing severe or concerning symptoms, contact your
        doctor or local emergency services right away.
      </div>

      <label
        className="card flat list-tap"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          style={{ width: 22, height: 22, marginTop: 2 }}
        />
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          I understand GLPenPal is for friendship and peer support, not medical
          advice.
        </span>
      </label>

      <label
        className="card flat list-tap"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={adult}
          onChange={(e) => setAdult(e.target.checked)}
          style={{ width: 22, height: 22, marginTop: 2 }}
        />
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          I confirm I am 18 years of age or older.
        </span>
      </label>

      <label
        className="card flat list-tap"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={agreedTerms}
          onChange={(e) => setAgreedTerms(e.target.checked)}
          style={{ width: 22, height: 22, marginTop: 2 }}
        />
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          I agree to the{' '}
          <a onClick={(e) => { e.preventDefault(); navigate('/terms') }}>Terms</a> and{' '}
          <a onClick={(e) => { e.preventDefault(); navigate('/privacy') }}>Privacy Policy</a>.
        </span>
      </label>

      <button className="btn" disabled={!ready} onClick={accept}>
        I agree — find my buddy
      </button>
    </div>
  )
}
