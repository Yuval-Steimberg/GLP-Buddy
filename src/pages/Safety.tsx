import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'

export function Safety() {
  const navigate = useNavigate()
  const { acceptSafety } = useStore()
  const [checked, setChecked] = useState(false)

  const accept = () => {
    acceptSafety()
    navigate('/matches')
  }

  return (
    <div className="screen no-nav">
      <div className="center" style={{ marginTop: 12 }}>
        <div style={{ fontSize: 52 }}>🛟</div>
        <h1>Before you start</h1>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <p style={{ color: 'var(--ink)', fontWeight: 600 }}>
          <strong>GLP Buddy is a peer-support platform and does not provide medical
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
        🚑 If you're experiencing severe or concerning symptoms, contact your
        doctor or local emergency services right away.
      </div>

      <label
        className="card flat list-tap"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ width: 22, height: 22, marginTop: 2 }}
        />
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          I understand GLP Buddy is for friendship and peer support, not medical
          advice.
        </span>
      </label>

      <button className="btn" disabled={!checked} onClick={accept}>
        I agree — find my buddy
      </button>
    </div>
  )
}
