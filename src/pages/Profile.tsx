import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { MAX_BUDDIES } from '../constants'

export function Profile() {
  const navigate = useNavigate()
  const { currentUser, activeRelationships, buddyOf, resetApp, trioEligibility, activeTrio } = useStore()
  if (!currentUser) return null
  const p = currentUser.profile
  const rels = activeRelationships()
  const elig = trioEligibility()

  const info: [string, string][] = [
    ['Age', p.ageRange],
    ['Gender', p.gender],
    ['Buddy preference', p.genderPreference],
    ['Language', p.language],
    ['Location', p.country],
    ['Medication', p.medication],
    ['Treatment stage', p.treatmentStage],
    ['Current weight', p.currentWeightRange],
    ['Goal weight', p.goalWeightRange],
    ['Main goal', p.mainGoal],
    ['Communication', p.communicationPreference],
  ]

  return (
    <div className="screen">
      <TopBar title="Profile" />

      <div className="card center">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Avatar name={p.nickname} size={80} />
        </div>
        <h2>{p.nickname}</h2>
        <div className="chip-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <span className="chip primary">💊 {p.medication}</span>
          <span className="chip green">🎯 {p.mainGoal}</span>
        </div>
        <p style={{ marginTop: 12 }}>{p.bio}</p>
        {p.interests.length > 0 && (
          <div className="chip-row" style={{ justifyContent: 'center', marginTop: 8 }}>
            {p.interests.map((i) => <span key={i} className="chip">{i}</span>)}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row between">
          <h3>Active buddies</h3>
          <span className="chip">{rels.length} / {MAX_BUDDIES}</span>
        </div>
        <p style={{ marginTop: 4, fontSize: 13 }}>You can have up to {MAX_BUDDIES} active buddy relationships.</p>
        {rels.length === 0 ? (
          <button className="btn ghost" onClick={() => navigate('/matches')}>Find a buddy →</button>
        ) : (
          <div className="stack" style={{ marginTop: 8 }}>
            {rels.map((r) => {
              const b = buddyOf(r)
              return (
                <div key={r.id} className="row list-tap" onClick={() => navigate(`/chat/${r.id}`)}>
                  <Avatar name={b.profile.nickname} size={38} />
                  <span style={{ fontWeight: 700, flex: 1 }}>{b.profile.nickname}</span>
                  <span className="muted">›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card list-tap" style={{ display: 'flex', gap: 12, alignItems: 'center' }} onClick={() => navigate('/trio')}>
        <span style={{ fontSize: 26 }}>{activeTrio() ? '👥' : elig.eligible ? '🎉' : '🔒'}</span>
        <div style={{ flex: 1 }}>
          <strong>Buddy Trio</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {activeTrio() ? 'Active' : elig.eligible ? 'Unlocked — create one' : 'Locked'}
          </div>
        </div>
        <span className="muted">›</span>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Your details</h3>
        <div className="stack">
          {info.map(([k, v]) => (
            <div className="row between" key={k} style={{ fontSize: 14 }}>
              <span className="muted">{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <h3>Trust &amp; safety</h3>
        <p style={{ fontSize: 13 }}>
          GLP Buddy is peer support — <strong>not medical advice</strong>. Never share dosing
          guidance, and for concerning symptoms contact a clinician or emergency services.
          You can report or block any buddy from your chat.
        </p>
      </div>

      <button className="btn outline" onClick={() => navigate('/onboarding')}>Edit profile</button>
      <button
        className="btn ghost"
        style={{ marginTop: 8, color: 'var(--danger)' }}
        onClick={() => { if (confirm('Reset the demo and clear all data?')) { resetApp(); navigate('/') } }}
      >
        Reset demo data
      </button>
    </div>
  )
}
