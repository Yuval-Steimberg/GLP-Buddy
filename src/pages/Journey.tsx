import { useMemo, useState } from 'react'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { useStore } from '../store/AppStore'
import type { InjectionLog, SymptomLog } from '../types'

const DAY = 24 * 60 * 60 * 1000
const SYMPTOMS = ['Nausea', 'Fatigue', 'Constipation', 'Reflux', 'Headache', 'Low appetite', 'Other']
const SITES = ['Abdomen · left', 'Abdomen · right', 'Thigh · left', 'Thigh · right', 'Upper arm · left', 'Upper arm · right', 'Other']
const SEVERITY = [
  { value: 1, label: 'Very mild' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Very strong' },
] as const

const shortDate = (value: number) => new Date(value).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
})
const longDate = (value: number) => new Date(value).toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const inputDate = (value = Date.now()) => {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function Journey() {
  const {
    currentUser,
    state,
    isPremium,
    myInjectionLogs,
    mySymptomLogs,
    logInjection,
    deleteInjection,
    logSymptom,
    deleteSymptom,
    currentStreak,
  } = useStore()
  const [injectionOpen, setInjectionOpen] = useState(false)
  const [symptomOpen, setSymptomOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const injections = myInjectionLogs()
  const symptoms = mySymptomLogs()

  const insights = useMemo(() => {
    if (!currentUser) return null
    const cutoff = Date.now() - 30 * DAY
    const recentSymptoms = symptoms.filter((x) => x.loggedAt >= cutoff)
    const symptomCounts = new Map<string, number>()
    recentSymptoms.forEach((x) => symptomCounts.set(x.symptom, (symptomCounts.get(x.symptom) ?? 0) + 1))
    const topSymptom = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    const weights = state.weightLogs
      .filter((x) => x.userId === currentUser.id)
      .sort((a, b) => a.loggedAt - b.loggedAt)
    const change = weights.length >= 2
      ? Math.round((weights[weights.length - 1].kg - weights[0].kg) * 10) / 10
      : null
    const meals = state.meals.filter((x) => x.userId === currentUser.id && x.createdAt >= Date.now() - 7 * DAY)
    const protein = meals.length
      ? Math.round(meals.reduce((sum, meal) => sum + meal.proteinG, 0) / meals.length)
      : null
    return {
      topSymptom: topSymptom?.[0] ?? null,
      symptomCount: recentSymptoms.length,
      weightChange: change,
      protein,
      streak: currentStreak(currentUser.id),
    }
  }, [currentStreak, currentUser, state.meals, state.weightLogs, symptoms])

  if (!currentUser || !insights) return null

  const lastInjection = injections[0]
  const nextLabel = nextInjectionLabel(currentUser.profile.injectionWeekday)
  const history = [
    ...injections.map((entry) => ({ kind: 'injection' as const, at: entry.injectedAt, entry })),
    ...symptoms.map((entry) => ({ kind: 'symptom' as const, at: entry.loggedAt, entry })),
  ].sort((a, b) => b.at - a.at)

  const exportReport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const { exportClinicalReport } = await import('../lib/clinicalReport')
      await exportClinicalReport({
        profile: currentUser.profile,
        injections,
        symptoms,
        weights: state.weightLogs.filter((x) => x.userId === currentUser.id),
        checkins: state.checkins.filter((x) => x.userId === currentUser.id),
        meals: state.meals.filter((x) => x.userId === currentUser.id),
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="screen journey-screen">
      <TopBar title="My journey" back />

      <section className="journey-hero">
        <div className="journey-hero-copy">
          <span className="section-kicker">YOUR PRIVATE GLP RECORD</span>
          <h1>See the week clearly.</h1>
          <p>Keep injections, symptoms and progress together—ready when you or your clinician need it.</p>
        </div>
        <div className="journey-week">
          <div>
            <span>Next injection</span>
            <strong>{nextLabel}</strong>
          </div>
          <div>
            <span>Last logged</span>
            <strong>{lastInjection ? shortDate(lastInjection.injectedAt) : 'Not yet'}</strong>
          </div>
        </div>
      </section>

      <div className="journey-actions">
        <button className="journey-action primary" onClick={() => setInjectionOpen(true)}>
          <span><Icon name="syringe" size={22} /></span>
          <strong>Log injection</strong>
          <small>Dose, date and site</small>
        </button>
        <button className="journey-action" onClick={() => setSymptomOpen(true)}>
          <span><Icon name="pulse" size={22} /></span>
          <strong>Log symptom</strong>
          <small>Private severity note</small>
        </button>
      </div>

      <section className="card journey-insights">
        <div className="row between journey-section-head">
          <div>
            <span className="section-kicker">PERSONAL INSIGHTS</span>
            <h2>Your recent pattern</h2>
          </div>
          <span className="plus-chip"><Icon name="spark" size={13} /> Plus preview</span>
        </div>
        <div className="journey-insight-grid">
          <Insight
            label="30-day symptoms"
            value={insights.symptomCount ? String(insights.symptomCount) : '—'}
            detail={insights.topSymptom ? `Most logged: ${insights.topSymptom}` : 'Start logging to see patterns'}
          />
          <Insight
            label="Weight trend"
            value={insights.weightChange == null ? '—' : `${insights.weightChange > 0 ? '+' : ''}${insights.weightChange} kg`}
            detail={insights.weightChange == null ? 'Log two weights to see a trend' : 'Across your recorded history'}
          />
          <Insight
            label="Wellbeing streak"
            value={insights.streak ? `${insights.streak}d` : '—'}
            detail="Consecutive daily pulse check-ins"
          />
          <Insight
            label="Protein signal"
            value={insights.protein == null ? '—' : `${insights.protein}g`}
            detail={insights.protein == null ? 'Log meals to build this insight' : 'Average per logged meal · 7 days'}
          />
        </div>
        <p className="journey-insight-note">
          These are summaries of what you entered—not medical interpretation or advice.
        </p>
      </section>

      <section className="card journey-report">
        <span className="journey-report-icon"><Icon name="doc" size={23} /></span>
        <div>
          <span className="section-kicker">CLINICIAN-READY</span>
          <h3>Bring a clearer summary</h3>
          <p>A private 90-day PDF with injection history, symptom frequency, weight trend and your own notes.</p>
        </div>
        <button className="btn" disabled={exporting || !isPremium} onClick={exportReport}>
          <Icon name="download" size={17} />
          {exporting ? 'Preparing…' : 'Download summary'}
        </button>
      </section>

      <section className="journey-history">
        <div className="row between journey-section-head">
          <div>
            <span className="section-kicker">RECENT HISTORY</span>
            <h2>Your entries</h2>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{history.length} total</span>
        </div>
        {history.length === 0 ? (
          <div className="empty journey-empty">
            <div className="empty-ico"><Icon name="clock" size={28} /></div>
            <h3>Your first entry starts the pattern</h3>
            <p>Log an injection or symptom. Everything here stays private to you.</p>
          </div>
        ) : (
          <div className="journey-history-list">
            {history.slice(0, 20).map((item) => (
              item.kind === 'injection'
                ? <InjectionRow key={`i-${item.entry.id}`} entry={item.entry} onDelete={deleteInjection} />
                : <SymptomRow key={`s-${item.entry.id}`} entry={item.entry} onDelete={deleteSymptom} />
            ))}
          </div>
        )}
      </section>

      <div className="card journey-safety">
        <Icon name="shield" size={20} />
        <p>
          GLPenPal records what you enter but does not interpret symptoms or recommend medication changes.
          For medical questions or concerning symptoms, contact your clinician or pharmacist.
        </p>
      </div>

      <InjectionSheet
        open={injectionOpen}
        medication={currentUser.profile.medication}
        onClose={() => setInjectionOpen(false)}
        onSave={logInjection}
      />
      <SymptomSheet
        open={symptomOpen}
        onClose={() => setSymptomOpen(false)}
        onSave={logSymptom}
      />
    </div>
  )
}

function Insight({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="journey-insight">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function InjectionRow({ entry, onDelete }: { entry: InjectionLog; onDelete: (id: string) => void }) {
  return (
    <div className="journey-history-row">
      <span className="journey-history-icon injection"><Icon name="syringe" size={18} /></span>
      <div>
        <strong>{entry.medication}{entry.dose ? ` · ${entry.dose}` : ''}</strong>
        <small>{longDate(entry.injectedAt)}{entry.injectionSite ? ` · ${entry.injectionSite}` : ''}</small>
        {entry.note && <p>{entry.note}</p>}
      </div>
      <button className="icon-btn journey-delete" onClick={() => onDelete(entry.id)} aria-label="Delete injection entry">
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}

function SymptomRow({ entry, onDelete }: { entry: SymptomLog; onDelete: (id: string) => void }) {
  return (
    <div className="journey-history-row">
      <span className="journey-history-icon symptom"><Icon name="pulse" size={18} /></span>
      <div>
        <strong>{entry.symptom}</strong>
        <small>{longDate(entry.loggedAt)} · Severity {entry.severity}/5</small>
        {entry.note && <p>{entry.note}</p>}
      </div>
      <button className="icon-btn journey-delete" onClick={() => onDelete(entry.id)} aria-label="Delete symptom entry">
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}

function InjectionSheet({
  open,
  medication,
  onClose,
  onSave,
}: {
  open: boolean
  medication: string
  onClose: () => void
  onSave: (entry: Omit<InjectionLog, 'id' | 'userId' | 'createdAt'>) => void
}) {
  const [dose, setDose] = useState('')
  const [site, setSite] = useState('')
  const [date, setDate] = useState(inputDate)
  const [note, setNote] = useState('')

  const save = () => {
    const injectedAt = new Date(`${date}T12:00:00`).getTime()
    if (!Number.isFinite(injectedAt)) return
    onSave({
      medication,
      dose: dose.trim() || undefined,
      injectionSite: site || undefined,
      note: note.trim() || undefined,
      injectedAt,
    })
    setDose('')
    setSite('')
    setDate(inputDate())
    setNote('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <span className="section-kicker">PRIVATE JOURNEY LOG</span>
      <h2>Log injection</h2>
      <p style={{ marginTop: 5 }}>Record what you took. GLPenPal never recommends or changes your dose.</p>
      <div className="journey-form-grid">
        <div className="field">
          <label>Medication</label>
          <input className="input" value={medication} disabled />
        </div>
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} max={inputDate()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Dose as prescribed (optional)</label>
          <input className="input" value={dose} maxLength={40} placeholder="e.g. 2.5 mg" onChange={(e) => setDose(e.target.value)} />
        </div>
        <div className="field">
          <label>Injection site (optional)</label>
          <select className="input" value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">Select site…</option>
            {SITES.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Personal note (optional)</label>
        <textarea className="input" maxLength={500} value={note} placeholder="Anything you want to remember for your next appointment" onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn" onClick={save}>Save injection</button>
    </Sheet>
  )
}

function SymptomSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (entry: Omit<SymptomLog, 'id' | 'userId' | 'createdAt'>) => void
}) {
  const [symptom, setSymptom] = useState('')
  const [severity, setSeverity] = useState<SymptomLog['severity']>(2)
  const [date, setDate] = useState(inputDate)
  const [note, setNote] = useState('')

  const save = () => {
    const loggedAt = new Date(`${date}T12:00:00`).getTime()
    if (!symptom || !Number.isFinite(loggedAt)) return
    onSave({ symptom, severity, note: note.trim() || undefined, loggedAt })
    setSymptom('')
    setSeverity(2)
    setDate(inputDate())
    setNote('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <span className="section-kicker">PRIVATE JOURNEY LOG</span>
      <h2>Log symptom</h2>
      <p style={{ marginTop: 5 }}>A factual record for you and your clinician—without diagnosis or interpretation.</p>
      <div className="field" style={{ marginTop: 16 }}>
        <label>What did you notice?</label>
        <div className="option-grid compact">
          {SYMPTOMS.map((value) => (
            <button key={value} className={`option${symptom === value ? ' selected' : ''}`} onClick={() => setSymptom(value)}>
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>How strong was it?</label>
        <div className="severity-picker" role="group" aria-label="Symptom severity">
          {SEVERITY.map((item) => (
            <button
              key={item.value}
              className={severity === item.value ? 'selected' : ''}
              aria-pressed={severity === item.value}
              onClick={() => setSeverity(item.value)}
            >
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="journey-form-grid">
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} max={inputDate()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Personal note (optional)</label>
          <input className="input" maxLength={500} value={note} placeholder="What was happening that day?" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <button className="btn" disabled={!symptom} onClick={save}>Save symptom</button>
    </Sheet>
  )
}

function nextInjectionLabel(weekday?: number) {
  if (weekday == null) return 'Set in profile'
  const today = new Date()
  const days = (weekday - today.getDay() + 7) % 7
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  const next = new Date(today.getTime() + days * DAY)
  return next.toLocaleDateString('en-US', { weekday: 'long' })
}
