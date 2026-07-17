import { useMemo, useRef, useState } from 'react'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { useStore } from '../store/AppStore'
import { fileToChatImage, safeImageSrc } from '../lib/image'
import type { AnalyzedMeal, Meal, MealItem } from '../types'

// Scale one analyzed item to a new gram weight (macros scale linearly with
// grams). If the model gave no grams, the item can't be rescaled — keep it.
function scaleItem(base: MealItem, grams: number): MealItem {
  if (!base.grams || base.grams <= 0) return { ...base, grams }
  const f = grams / base.grams
  return {
    name: base.name,
    grams,
    calories: Math.round(base.calories * f),
    proteinG: Math.round(base.proteinG * f),
    carbsG: Math.round(base.carbsG * f),
    fatG: Math.round(base.fatG * f),
  }
}

function mealCaption(title: string, cal: number, protein: number): string {
  return `Logged: ${title} — about ${cal} kcal, ${protein}g protein`
}

function stamp(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Food Log — snap a meal, get a per-item macro estimate (Claude vision), fine-
// tune the grams for accuracy, save it privately, and optionally share it.
// Estimates are approximate and NOT medical or nutritional advice.
export function MealLog() {
  const { analyzeMeal, saveMeal, deleteMeal, myMeals, activeRelationships, buddyOf, addTimelinePhoto, sendMessage } = useStore()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalyzedMeal | null>(null)
  const [grams, setGrams] = useState<number[]>([]) // current grams per item
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const [share, setShare] = useState<{ imageUrl?: string; caption: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const meals = myMeals()
  const rels = activeRelationships()

  // Current (possibly edited) items + totals, derived from the base estimate.
  const cur = useMemo(() => {
    if (!result) return null
    const items = result.items.map((it, i) => scaleItem(it, grams[i] ?? it.grams))
    const calories = items.reduce((n, it) => n + it.calories, 0)
    const proteinG = items.reduce((n, it) => n + it.proteinG, 0)
    const carbsG = items.reduce((n, it) => n + it.carbsG, 0)
    const fatG = items.reduce((n, it) => n + it.fatG, 0)
    // Fiber is a meal-level figure; scale it with the overall calorie change.
    const fiberG = result.calories > 0 ? Math.round(result.fiberG * (calories / result.calories)) : result.fiberG
    return { items, calories, proteinG, carbsG, fatG, fiberG }
  }, [result, grams])

  const reset = () => { setPhoto(null); setResult(null); setGrams([]); setError(null); setNote('') }

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
      setGrams(est.items.map((it) => it.grams))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg === 'no_food'
        ? "I couldn't spot any food in that photo — try a clearer shot of your plate."
        : "I couldn't estimate that one just now. Please try again in a moment.")
    } finally {
      setAnalyzing(false)
    }
  }

  const setGram = (i: number, g: number) => setGrams((prev) => prev.map((v, j) => (j === i ? Math.max(0, g) : v)))

  const save = () => {
    if (!result || !cur) return
    saveMeal({
      imageUrl: photo ?? undefined,
      title: result.title,
      calories: cur.calories,
      proteinG: cur.proteinG,
      carbsG: cur.carbsG,
      fatG: cur.fatG,
      fiberG: cur.fiberG,
      items: cur.items,
      note: note.trim() || undefined,
    })
    reset()
    setToast('Saved to your food log')
  }

  const flash = (msg: string) => { setToast(msg); setShare(null) }
  const shareToTimeline = (relId: string) => { if (share?.imageUrl) addTimelinePhoto(relId, share.imageUrl, share.caption); flash('Shared to your timeline') }
  const shareToChat = (relId: string) => { if (share) sendMessage(relId, share.caption, share.imageUrl); flash('Sent to your chat') }
  const openShare = (m: { imageUrl?: string; title: string; calories: number; proteinG: number }) => {
    if (rels.length === 0) return
    setShare({ imageUrl: m.imageUrl, caption: mealCaption(m.title, m.calories, m.proteinG) })
  }

  // Today's running totals across all logged meals.
  const todayStr = new Date().toDateString()
  const today = meals.filter((m) => new Date(m.createdAt).toDateString() === todayStr)
  const dayTot = today.reduce(
    (a, m) => ({ cal: a.cal + m.calories, p: a.p + m.proteinG, c: a.c + m.carbsG, f: a.f + m.fatG }),
    { cal: 0, p: 0, c: 0, f: 0 },
  )

  return (
    <div className="screen">
      <TopBar title="Food log" back />

      {toast && <div className="toast" onAnimationEnd={() => setToast(null)}>{toast}</div>}

      {today.length > 0 && !result && !analyzing && (
        <div className="card meal-today">
          <div className="muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em' }}>TODAY · {today.length} {today.length === 1 ? 'meal' : 'meals'}</div>
          <div className="meal-today-grid">
            <div><strong>{dayTot.cal}</strong><span>calories</span></div>
            <div><strong>{dayTot.p}g</strong><span>protein</span></div>
            <div><strong>{dayTot.c}g</strong><span>carbs</span></div>
            <div><strong>{dayTot.f}g</strong><span>fat</span></div>
          </div>
        </div>
      )}

      {/* Capture */}
      {!result && !analyzing && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Estimate a meal</h3>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
            Take a photo of your plate for an estimate of calories, protein, carbs and fat — then fine-tune the grams.
          </p>
          <div className="meal-actions">
            <button className="btn" onClick={() => cameraRef.current?.click()}><Icon name="camera" size={18} /> Take photo</button>
            <button className="btn outline" onClick={() => galleryRef.current?.click()}><Icon name="image" size={18} /> Choose photo</button>
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
            <strong>Reading your plate…</strong>
          </div>
        </div>
      )}

      {/* Result */}
      {result && cur && !analyzing && (
        <div className="card">
          {safeImageSrc(photo) && <img className="meal-photo" src={safeImageSrc(photo)} alt="Your meal" />}
          <h3 style={{ margin: '12px 0 2px' }}>{result.title}</h3>
          <div className="muted" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em' }}>
            {(result.confidence ?? 'medium').toUpperCase()} CONFIDENCE
            {result.caloriesLow != null && result.caloriesHigh != null && ` · RANGE ${result.caloriesLow}–${result.caloriesHigh} KCAL`}
          </div>

          <div className="meal-cal"><strong>{cur.calories}</strong><span>calories</span></div>
          <div className="meal-macros">
            <div className="meal-macro protein"><strong>{cur.proteinG}g</strong><span>protein</span></div>
            <div className="meal-macro"><strong>{cur.carbsG}g</strong><span>carbs</span></div>
            <div className="meal-macro"><strong>{cur.fatG}g</strong><span>fat</span></div>
            <div className="meal-macro"><strong>{cur.fiberG}g</strong><span>fiber</span></div>
          </div>

          {cur.items.length > 0 && (
            <>
              <p className="muted" style={{ margin: '16px 2px 6px', fontSize: 13 }}>Adjust grams if a portion looks off — totals update automatically.</p>
              <ul className="meal-items">
                {cur.items.map((it, i) => (
                  <li key={i}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{it.calories} kcal · {it.proteinG}p / {it.carbsG}c / {it.fatG}f</div>
                    </div>
                    <div className="gram-stepper">
                      <button aria-label="Less" onClick={() => setGram(i, (grams[i] ?? it.grams) - 5)}>−</button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={grams[i] ?? it.grams}
                        onChange={(e) => setGram(i, Math.round(Number(e.target.value) || 0))}
                      />
                      <span className="g">g</span>
                      <button aria-label="More" onClick={() => setGram(i, (grams[i] ?? it.grams) + 5)}>+</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <input
            className="input"
            style={{ marginTop: 12 }}
            placeholder="Add a note (optional) — e.g. lunch, cooked in oil…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
          <p className="muted meal-disclaimer">Estimates are approximate — not medical or nutritional advice.</p>

          <div className="stack" style={{ marginTop: 4 }}>
            <button className="btn" onClick={save}><Icon name="check" size={18} /> Save to food log</button>
            {rels.length > 0 && (
              <button className="btn outline" onClick={() => openShare({ imageUrl: photo ?? undefined, title: result.title, calories: cur.calories, proteinG: cur.proteinG })}>
                <Icon name="share" size={18} /> Share
              </button>
            )}
            <button className="btn ghost" onClick={reset}>Discard</button>
          </div>
        </div>
      )}

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
                  <div className="muted" style={{ fontSize: 13 }}>{m.calories} kcal · {m.proteinG}p / {m.carbsG}c / {m.fatG}f</div>
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
