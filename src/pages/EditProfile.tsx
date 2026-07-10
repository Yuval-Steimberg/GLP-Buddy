import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { fileToAvatarDataUrl } from '../lib/image'
import {
  AGE_RANGES,
  COMMUNICATION_PREFERENCES,
  COUNTRIES,
  GENDERS,
  GENDER_PREFERENCES,
  LANGUAGES,
  MAIN_GOALS,
  MEDICATIONS,
  TREATMENT_STAGES,
  WEIGHT_RANGES,
} from '../constants'
import type { Profile } from '../types'

const INTEREST_OPTIONS = [
  'Cooking', 'Hiking', 'Walking', 'Running', 'Cycling', 'Yoga', 'Swimming',
  'Reading', 'Movies', 'Music', 'Gaming', 'Gardening', 'Travel', 'Photography',
  'Pottery', 'Coffee', 'Baking', 'Pets', 'Parenting', 'Tech',
]

// Single-page profile editor: every field is pre-filled and editable on one
// screen, so a user can change just one thing without redoing onboarding.
export function EditProfile() {
  const navigate = useNavigate()
  const { currentUser, updateProfile } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [p, setP] = useState<Profile>(() => ({ ...(currentUser?.profile as Profile) }))

  if (!currentUser) return null

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setP((prev) => ({ ...prev, [k]: v }))

  const toggleInterest = (i: string) =>
    setP((prev) => ({
      ...prev,
      interests: prev.interests.includes(i)
        ? prev.interests.filter((x) => x !== i)
        : [...prev.interests, i],
    }))

  const pickPhoto = async (file?: File) => {
    if (!file) return
    try {
      set('avatarUrl', await fileToAvatarDataUrl(file))
    } catch {
      alert('Sorry, that image could not be used. Try another photo.')
    }
  }

  const canSave = p.nickname.trim().length > 0

  const save = () => {
    if (!canSave) return
    updateProfile({ ...p, nickname: p.nickname.trim() })
    navigate('/profile')
  }

  return (
    <div className="screen no-nav">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/profile')} aria-label="Back">‹</button>
        <span className="title" style={{ fontSize: 20 }}>Edit profile</span>
        <div className="spacer" />
      </div>

      <p style={{ marginTop: 0 }}>Change anything you like — you don't have to touch the rest.</p>

      <div className="card center">
        <label style={{ display: 'block', fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Profile photo</label>
        <button type="button" className="avatar-picker" onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
          <Avatar name={p.nickname || 'You'} size={96} src={p.avatarUrl} />
          <span className="avatar-picker-badge"><Icon name="plus" size={16} /></span>
        </button>
        {p.avatarUrl && (
          <div><button type="button" className="btn ghost" style={{ marginTop: 6 }} onClick={() => set('avatarUrl', undefined)}>Remove photo</button></div>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </div>

      <div className="card">
        <div className="field">
          <label>First name or nickname</label>
          <input className="input" value={p.nickname} onChange={(e) => set('nickname', e.target.value)} />
        </div>
        <Picker label="Age range" options={AGE_RANGES} value={p.ageRange} onPick={(v) => set('ageRange', v)} />
        <Picker label="Gender" options={GENDERS} value={p.gender} onPick={(v) => set('gender', v)} />
      </div>

      <div className="card">
        <Picker label="Buddy gender preference" options={GENDER_PREFERENCES} value={p.genderPreference} onPick={(v) => set('genderPreference', v as Profile['genderPreference'])} />
        <div className="field">
          <label>Language</label>
          <select className="input" value={p.language} onChange={(e) => set('language', e.target.value)}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Country / time zone</label>
          <select className="input" value={p.country} onChange={(e) => set('country', e.target.value)}>
            <option value="">Select…</option>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <Picker label="Medication" options={MEDICATIONS} value={p.medication} onPick={(v) => set('medication', v as Profile['medication'])} />
        <Picker label="Treatment stage" options={TREATMENT_STAGES} value={p.treatmentStage} onPick={(v) => set('treatmentStage', v as Profile['treatmentStage'])} />
        <Picker label="Current weight range" options={WEIGHT_RANGES} value={p.currentWeightRange} onPick={(v) => set('currentWeightRange', v)} />
        <Picker label="Goal weight range" options={WEIGHT_RANGES} value={p.goalWeightRange} onPick={(v) => set('goalWeightRange', v)} />
      </div>

      <div className="card">
        <Picker label="Main goal" options={MAIN_GOALS} value={p.mainGoal} onPick={(v) => set('mainGoal', v as Profile['mainGoal'])} />
        <Picker label="Communication preference" options={COMMUNICATION_PREFERENCES} value={p.communicationPreference} onPick={(v) => set('communicationPreference', v as Profile['communicationPreference'])} />
      </div>

      <div className="card">
        <div className="field">
          <label>Your bio</label>
          <textarea className="input" value={p.bio} onChange={(e) => set('bio', e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Interests</label>
          <div className="option-grid">
            {INTEREST_OPTIONS.map((i) => (
              <button key={i} className={`option${p.interests.includes(i) ? ' selected' : ''}`} onClick={() => toggleInterest(i)}>{i}</button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn" disabled={!canSave} onClick={save}>Save changes</button>
      <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => navigate('/profile')}>Cancel</button>
    </div>
  )
}

function Picker({ label, options, value, onPick }: {
  label: string
  options: readonly string[]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="option-grid">
        {options.map((o) => (
          <button key={o} className={`option${value === o ? ' selected' : ''}`} onClick={() => onPick(o)}>{o}</button>
        ))}
      </div>
    </div>
  )
}
