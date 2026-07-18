import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Avatar } from '../components/Avatar'
import { BrandLockup, Icon, type IconName } from '../components/Icon'
import { fileToAvatarDataUrl } from '../lib/image'
import type { Profile } from '../types'
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

const INTEREST_OPTIONS = [
  'Cooking', 'Hiking', 'Walking', 'Running', 'Cycling', 'Yoga', 'Swimming',
  'Reading', 'Movies', 'Music', 'Gaming', 'Gardening', 'Travel', 'Photography',
  'Pottery', 'Coffee', 'Baking', 'Pets', 'Parenting', 'Tech',
]

const emptyProfile: Profile = {
  nickname: '',
  ageRange: '',
  gender: '',
  genderPreference: 'No preference',
  language: 'English',
  country: '',
  medication: 'Ozempic',
  treatmentStage: 'First injection',
  currentWeightRange: '',
  goalWeightRange: '',
  mainGoal: 'Weight loss',
  communicationPreference: 'Few times a week',
  bio: '',
  interests: [],
}

const TOTAL_STEPS = 6

const ONBOARDING_STEPS: ReadonlyArray<{
  title: string
  shortTitle: string
  eyebrow: string
  icon: IconName
}> = [
  { title: 'Create your profile', shortTitle: 'About you', eyebrow: 'START WITH YOU', icon: 'profile' },
  { title: 'Set your preferences', shortTitle: 'Preferences', eyebrow: 'YOUR IDEAL MATCH', icon: 'users' },
  { title: 'Share your GLP journey', shortTitle: 'Medication', eyebrow: 'YOUR JOURNEY', icon: 'meal' },
  { title: 'Mark your starting point', shortTitle: 'Progress', eyebrow: 'PRIVATE PROGRESS', icon: 'growth' },
  { title: 'Choose your support style', shortTitle: 'Support', eyebrow: 'WHAT YOU NEED', icon: 'heart' },
  { title: 'Show what makes you, you', shortTitle: 'Your story', eyebrow: 'THE HUMAN PART', icon: 'spark' },
]

export function Onboarding() {
  const navigate = useNavigate()
  const { completeOnboarding } = useStore()
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(emptyProfile)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setP((prev) => ({ ...prev, [k]: v }))

  const pickPhoto = async (file?: File) => {
    if (!file) return
    try {
      set('avatarUrl', await fileToAvatarDataUrl(file))
    } catch {
      alert('Sorry, that image could not be used. Try another photo.')
    }
  }

  const toggleInterest = (i: string) =>
    setP((prev) => ({
      ...prev,
      interests: prev.interests.includes(i)
        ? prev.interests.filter((x) => x !== i)
        : [...prev.interests, i],
    }))

  const canContinue = (): boolean => {
    switch (step) {
      case 0:
        return p.nickname.trim().length > 0 && !!p.ageRange && !!p.gender
      case 1:
        return !!p.genderPreference && !!p.language && !!p.country
      case 2:
        return !!p.medication && !!p.treatmentStage
      case 3:
        return !!p.currentWeightRange && !!p.goalWeightRange
      case 4:
        return !!p.mainGoal && !!p.communicationPreference
      case 5:
        return p.bio.trim().length >= 10
      default:
        return false
    }
  }

  // Explains why "Continue" is disabled so users aren't left guessing.
  const missingHint = (): string => {
    switch (step) {
      case 0:
        if (!p.nickname.trim()) return 'Add your name or nickname to continue.'
        if (!p.ageRange) return 'Pick your age range to continue.'
        if (!p.gender) return 'Pick your gender to continue.'
        return ''
      case 1:
        if (!p.country) return 'Select your country to continue.'
        return 'Choose your preferences to continue.'
      case 3:
        if (!p.currentWeightRange) return 'Pick your current weight range to continue.'
        if (!p.goalWeightRange) return 'Pick your goal weight range to continue.'
        return ''
      case 5:
        return `Add a little more to your bio — at least 10 characters (${p.bio.trim().length}/10).`
      default:
        return 'Make a selection to continue.'
    }
  }

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
      window.scrollTo(0, 0)
    } else {
      completeOnboarding(p)
      navigate('/safety')
    }
  }

  const back = () => {
    if (step === 0) navigate('/')
    else setStep((s) => s - 1)
  }

  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100)
  const currentStep = ONBOARDING_STEPS[step]

  return (
    <div className="onboarding-screen">
      <aside className="onboarding-rail" aria-label="Onboarding progress">
        <BrandLockup height={48} />
        <div className="onboarding-rail-copy">
          <span className="onboarding-kicker">A BETTER MATCH STARTS HERE</span>
          <h2>Let’s find your person.</h2>
          <p>Six thoughtful steps. About two minutes. Everything stays private until you choose to connect.</p>
        </div>
        <ol className="onboarding-step-list">
          {ONBOARDING_STEPS.map((item, index) => {
            const status = index < step ? 'complete' : index === step ? 'active' : 'upcoming'
            return (
              <li key={item.shortTitle} className={`onboarding-step-item ${status}`}>
                <span className="onboarding-step-icon">
                  {status === 'complete' ? <Icon name="check" size={17} /> : <Icon name={item.icon} size={17} />}
                </span>
                <span>
                  <small>0{index + 1}</small>
                  <strong>{item.shortTitle}</strong>
                </span>
              </li>
            )
          })}
        </ol>
        <div className="onboarding-trust">
          <Icon name="lock" size={18} />
          <span><strong>Private by design</strong>Your health details are used only to improve matching.</span>
        </div>
      </aside>

      <main className="onboarding-form">
        <div className="onboarding-mobile-brand"><BrandLockup height={40} /></div>
        <header className="onboarding-topbar">
          <button className="onboarding-back" onClick={back} aria-label="Go back">
            <span aria-hidden>‹</span> Back
          </button>
          <div className="onboarding-progress-copy">
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
            <strong>{progress}%</strong>
          </div>
        </header>

        <div className="onboarding-progress" aria-label={`${progress}% complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="onboarding-step" key={step}>
          <div className="onboarding-heading">
            <span className="onboarding-kicker">{currentStep.eyebrow}</span>
            <span className="onboarding-heading-icon"><Icon name={currentStep.icon} size={20} /></span>
          </div>

          {step === 0 && (
        <div>
          <h1>Let's get to know you</h1>
          <p>This helps us find someone who really gets your journey.</p>
          <div className="field onboarding-photo-field">
            <label>Profile photo <span className="muted" style={{ fontWeight: 600 }}>(optional)</span></label>
            <button
              type="button"
              className="avatar-picker"
              onClick={() => fileRef.current?.click()}
              aria-label="Add profile photo"
            >
              <Avatar name={p.nickname || 'You'} size={96} src={p.avatarUrl} />
              <span className="avatar-picker-badge"><Icon name="plus" size={16} /></span>
            </button>
            {p.avatarUrl && (
              <div>
                <button type="button" className="btn ghost" style={{ marginTop: 6 }} onClick={() => set('avatarUrl', undefined)}>
                  Remove photo
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
          </div>
          <div className="field">
            <label>First name or nickname</label>
            <input
              className="input"
              value={p.nickname}
              placeholder="e.g. Alex"
              onChange={(e) => set('nickname', e.target.value)}
            />
          </div>
          <Picker label="Age range" options={AGE_RANGES} value={p.ageRange} onPick={(v) => set('ageRange', v)} />
          <Picker label="Gender" options={GENDERS} value={p.gender} onPick={(v) => set('gender', v)} />
        </div>
      )}

      {step === 1 && (
        <div>
          <h1>Your preferences</h1>
          <p>We use these to suggest compatible buddies.</p>
          <Picker
            label="Buddy gender preference"
            options={GENDER_PREFERENCES}
            value={p.genderPreference}
            onPick={(v) => set('genderPreference', v as Profile['genderPreference'])}
          />
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
      )}

      {step === 2 && (
        <div>
          <h1>Your GLP medication</h1>
          <p>We never share dosing or give medical guidance — this is just for matching.</p>
          <Picker
            label="Medication"
            options={MEDICATIONS}
            value={p.medication}
            onPick={(v) => set('medication', v as Profile['medication'])}
          />
          <Picker
            label="Treatment stage"
            options={TREATMENT_STAGES}
            value={p.treatmentStage}
            onPick={(v) => set('treatmentStage', v as Profile['treatmentStage'])}
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <h1>Where you're at</h1>
          <p>Ranges only — kept private and used to find a similar journey.</p>
          <Picker label="Current weight range" options={WEIGHT_RANGES} value={p.currentWeightRange} onPick={(v) => set('currentWeightRange', v)} />
          <Picker label="Goal weight range" options={WEIGHT_RANGES} value={p.goalWeightRange} onPick={(v) => set('goalWeightRange', v)} />
        </div>
      )}

      {step === 4 && (
        <div>
          <h1>What you're looking for</h1>
          <p>The kind of support that matters most to you right now.</p>
          <Picker
            label="Main goal"
            options={MAIN_GOALS}
            value={p.mainGoal}
            onPick={(v) => set('mainGoal', v as Profile['mainGoal'])}
          />
          <Picker
            label="Communication preference"
            options={COMMUNICATION_PREFERENCES}
            value={p.communicationPreference}
            onPick={(v) => set('communicationPreference', v as Profile['communicationPreference'])}
          />
        </div>
      )}

      {step === 5 && (
        <div>
          <h1>A little about you</h1>
          <p>Hobbies, profession, family, lifestyle — anything you'd want a buddy to know.</p>
          <div className="field">
            <label>Your bio</label>
            <div className="hint">At least a sentence or two. This is the heart of a good match.</div>
            <textarea
              className="input"
              value={p.bio}
              placeholder="I'm a teacher and mum of two who loves hiking and terrible reality TV…"
              onChange={(e) => set('bio', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Interests <span className="muted" style={{ fontWeight: 600 }}>(optional)</span></label>
            <div className="option-grid">
              {INTEREST_OPTIONS.map((i) => (
                <button
                  key={i}
                  className={`option${p.interests.includes(i) ? ' selected' : ''}`}
                  onClick={() => toggleInterest(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

        </div>

        <footer className="onboarding-actions">
          <div className="onboarding-action-copy" aria-live="polite">
            {canContinue() ? (
              <span className="ready"><Icon name="check" size={15} /> Looking good</span>
            ) : (
              <span>{missingHint()}</span>
            )}
          </div>
          <button className="btn onboarding-next" disabled={!canContinue()} onClick={next}>
            <span>{step === TOTAL_STEPS - 1 ? 'Build my matches' : 'Continue'}</span>
            <span aria-hidden>›</span>
          </button>
        </footer>
      </main>
    </div>
  )
}

function Picker({
  label,
  options,
  value,
  onPick,
}: {
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
          <button
            key={o}
            className={`option${value === o ? ' selected' : ''}`}
            onClick={() => onPick(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
