import { useRef, useState } from 'react'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { useStore } from '../store/AppStore'
import { fileToChatImage, safeImageSrc } from '../lib/image'
import type { AnalyzedMeal, Meal } from '../types'

const PORTIONS = [0.5, 1, 1.5, 2]

// A short, shareable one-liner for a meal.
function mealCaption(title: string, calories: number, proteinG: number): string {
  return `Logged: ${title} — about ${calories} kcal, ${proteinG}g protein`
}

function stamp(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Food Log — snap a meal, get an estimate of calories + protein (Claude vision),
// save it privately, and optionally share it to a buddy's timeline or chat.
// Estimates are approximate and NOT medical or nutritional advice.
export function MealLog() {
  const { analyzeMeal, saveMeal, deleteMeal, myMeals, activeRelationships, buddyOf, addTimelinePhoto, sendMessage } = useStore()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzedMeal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [portion, setPortion] = useState(1)
  const [note, setNote] = useState('')

  // The meal currently being shared (drives the share sheet).
  const [share, setShare] = useState<{ imageUrl?: string; caption: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const meals = myMeals()
  const rels = activeRelationships()

  const reset = () => { setPhoto(null); setResult(null); setError(null); setPortion(1); setNote('') }

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    reset()
    let img: string
    try {
      img = await fileToChatImage(file)
    } catch {
      setError('Could not read that photo. Try another one.')
      return
    }
    setPhoto(img)
    setAnalyzing(true)
    try {
      const est = await analyzeMeal(img)
      setResult(est)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg === 'no_food'
        ? "I couldn't spot any food in that photo — try a clearer shot of your plate."
        : "I couldn't estimate that one just now. Please try again in a moment.")
    } finally {
      setAnalyzing(false)
    }
  }

  const cal = result ? Math.round(result.calories * portion) : 0
  const prot = result ? Math.round(result.proteinG * portion) : 0

  const save = () => {
    if (!result) return
    saveMeal({
      imageUrl: photo ?? undefined,
      title: result.title,
      calories: cal,
      proteinG: prot,
      items: result.items.map((i) => ({ name: i.name, calories: Math.round(i.calories * portion), proteinG: Math.round(i.proteinG * portion) })),
      note: note.trim() || undefined,
    })
    reset()
    setToast('Saved to your food log')
  }

  const flash = (msg: string) => { setToast(msg); setShare(null) }

  const shareToTimeline = (relId: string) => {
    if (!share) return
    if (share.imageUrl) addTimelinePhoto(relId, share.imageUrl, share.caption)
    flash('Shared to your timeline')
  }
  const shareToChat = (relId: string) => {
    if (!share) return
    sendMessage(relId, share.caption, share.imageUrl)
    flash('Sent to your chat')
  }

  const openShare = (m: { imageUrl?: string; title: string; calories: number; proteinG: number }) => {
    if (rels.length === 0) return
    setShare({ imageUrl: m.imageUrl, caption: mealCaption(m.title, m.calories, m.proteinG) })
  }

  return (
    <div className="screen">
      <TopBar title="Food log" back />

      {toast && <div className="toast" onAnimationEnd={() => setToast(null)}>{toast}</div>}

      {/* Capture / analysis flow */}
      {!result && !analyzing && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Estimate a meal</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
            Take a photo of your plate and get a rough estimate of calories and protein.
          </p>
          <div className="meal-actions">
            <button className="btn" onClick={() => cameraRef.current?.click()}>
              <Icon name="camera" size={18} /> Take photo
            </button>
            <button className="btn outline" onClick={() => galleryRef.current?.click()}>
              <Icon name="image" size={18} /> Choose photo
            </button>
          </div>
          {error && <p style={{ color: 'var(--danger)', margin: '12px 2px 0', fontSize: 14 }}>{error}</p>}
          <p className="muted meal-disclaimer">Estimates are approximate — not medical or nutritional advice.</p>
        </div>
      )}

      {analyzing && (
        <div className="card meal-analyzing">
          {safeImageSrc(photo) && <img className="meal-photo" src={safeImageSrc(photo)} alt="Your meal" />}
          <div className="row" style={{ marginTop: 12 }}>
            <span className="row-ico"><Icon name="clock" size={18} /></span>
            <strong>Estimating calories &amp; protein…</strong>
          </div>
        </div>
      )}

      {/* Result card */}
      {result && !analyzing && (
        <div className="card">
          {safeImageSrc(photo) && <img className="meal-photo" src={safeImageSrc(photo)} alt="Your meal" />}
          <h3 style={{ margin: '12px 0 2px' }}>{result.title}</h3>
          {result.confidence && (
            <div className="muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em' }}>
              {result.confidence.toUpperCase()} CONFIDENCE ESTIMATE
            </div>
          )}

          <div className="meal-macros">
            <div className="meal-macro"><strong>{cal}</strong><span>calories</span></div>
            <div className="meal-macro protein"><strong>{prot}g</strong><span>protein</span></div>
          </div>

          <div className="meal-portion">
            <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Portion</span>
            <div className="theme-seg" role="group" aria-label="Portion size">
              {PORTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={'theme-seg-btn' + (portion === p ? ' is-on' : '')}
                  aria-pressed={portion === p}
                  onClick={() => setPortion(p)}
                >
                  {p === 1 ? '1×' : `${p}×`}
                </button>
              ))}
            </div>
          </div>

          {result.items.length > 0 && (
            <ul className="meal-items">
              {result.items.map((it, i) => (
                <li key={i}>
                  <span>{it.name}</span>
                  <span className="muted">{Math.round(it.calories * portion)} kcal · {Math.round(it.proteinG * portion)}g</span>
                </li>
              ))}
            </ul>
          )}

          <input
            className="input"
            style={{ marginTop: 12 }}
            placeholder="Add a note (optional) — e.g. lunch, large bowl…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
          <p className="muted meal-disclaimer">Estimates are approximate — not medical or nutritional advice.</p>

          <div className="stack" style={{ marginTop: 4 }}>
            <button className="btn" onClick={save}><Icon name="check" size={18} /> Save to food log</button>
            {rels.length > 0 && (
              <button className="btn outline" onClick={() => openShare({ imageUrl: photo ?? undefined, title: result.title, calories: cal, proteinG: prot })}>
                <Icon name="share" size={18} /> Share
              </button>
            )}
            <button className="btn ghost" onClick={reset}>Discard</button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} />

      {/* History */}
      <h3 style={{ margin: '22px 4px 10px' }}>Your meals</h3>
      {meals.length === 0 ? (
        <p className="muted" style={{ margin: '0 4px' }}>No meals yet — log your first one above.</p>
      ) : (
        <div className="stack">
          {meals.map((m: Meal) => {
            const img = safeImageSrc(m.imageUrl)
            return (
              <div className="card meal-row" key={m.id}>
                {img && <img className="meal-thumb" src={img} alt={m.title} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{m.calories} kcal · {m.proteinG}g protein</div>
                  <div className="muted" style={{ fontSize: 12 }}>{stamp(m.createdAt)}{m.note ? ` · ${m.note}` : ''}</div>
                </div>
                {rels.length > 0 && (
                  <button className="icon-btn" aria-label="Share meal" onClick={() => openShare(m)}><Icon name="share" size={17} /></button>
                )}
                <button className="icon-btn" aria-label="Delete meal" onClick={() => { if (confirm('Delete this meal?')) deleteMeal(m.id) }}><Icon name="close" size={17} /></button>
              </div>
            )
          })}
        </div>
      )}

      {/* Share sheet */}
      {share && (
        <div className="sheet-backdrop" onClick={() => setShare(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px' }}>Share this meal</h3>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>{share.caption}</p>
            {rels.map((rel) => {
              const b = buddyOf(rel)
              return (
                <div className="meal-share-row" key={rel.id}>
                  <span style={{ fontWeight: 700, flex: 1 }}>{b.profile.nickname}</span>
                  <button className="btn outline sm" onClick={() => shareToTimeline(rel.id)}><Icon name="growth" size={16} /> Timeline</button>
                  <button className="btn sm" onClick={() => shareToChat(rel.id)}><Icon name="chat" size={16} /> Chat</button>
                </div>
              )
            })}
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShare(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
