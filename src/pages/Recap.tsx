import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { BrandMark, Icon } from '../components/Icon'
import { shareYearReview } from '../lib/shareCards'
import type { YearReview } from '../types'

type Scene = {
  kicker?: string
  lines: string[]
  stat?: string
  tone: 'light' | 'brand'
  finale?: boolean
}

const SCENE_MS = 3800

// Build the recap "story" from the year review — an emotional, Spotify-Wrapped
// style sequence. Empty/irrelevant scenes are skipped.
function buildScenes(r: YearReview): Scene[] {
  const s: Scene[] = []
  s.push({ kicker: 'GLPENPAL', lines: [`Your ${r.year},`, 'wrapped.'], tone: 'brand' })

  if (r.journeyStart) {
    s.push({
      kicker: `IT BEGAN ${new Date(r.journeyStart).toLocaleDateString('en', { day: 'numeric', month: 'long' }).toUpperCase()}`,
      stat: `${r.daysOnJourney}`,
      lines: ['days on your', 'journey so far.'],
      tone: 'light',
    })
  }
  if (r.milestoneTypes.includes('First week completed') || r.milestoneTypes.includes('First injection completed')) {
    s.push({ kicker: 'REMEMBER YOUR FIRST WEEK?', lines: ['The hardest part', 'was starting.', 'And you did.'], tone: 'brand' })
  }
  if (r.kgLost != null) {
    s.push({ kicker: 'LOOK HOW FAR', stat: `${r.kgLost} kg`, lines: ['lighter than the', 'day you started.'], tone: 'light' })
  }
  if (r.milestoneTypes.includes('Overcame plateau')) {
    s.push({ kicker: 'REMEMBER YOUR PLATEAU?', lines: ['The scale stopped.', 'You didn’t.'], tone: 'brand' })
  }
  if (r.toughWeeks > 0) {
    s.push({ kicker: 'THE ROUGH WEEKS', stat: `${r.toughWeeks}`, lines: ['tough weeks — and you', 'got through every one.'], tone: 'light' })
  }
  if (r.favoriteEncouragement) {
    s.push({ kicker: 'WHEN YOU WANTED TO QUIT', lines: [`“${r.favoriteEncouragement}”`], tone: 'brand' })
  }
  if (r.topMilestone) {
    s.push({ kicker: 'YOUR BIGGEST MOMENT', lines: [r.topMilestone], tone: 'light' })
  }
  s.push({
    kicker: 'YOUR YEAR IN NUMBERS',
    lines: [
      `${r.milestones} milestone${r.milestones === 1 ? '' : 's'}`,
      `${r.messages} message${r.messages === 1 ? '' : 's'}`,
      `${r.buddies} buddy${r.buddies === 1 ? '' : ' buddies'} by your side`,
    ],
    tone: 'brand',
  })
  s.push({ kicker: `HERE’S TO ${r.year}`, lines: ['You showed up', 'for yourself.'], tone: 'light', finale: true })
  return s
}

export function Recap() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { reviewYears, yearReview, isPremium } = useStore()
  const years = reviewYears()
  const year = Number(params.get('year')) || years[0] || new Date().getFullYear()

  const review = useMemo(() => (years.length ? yearReview(year) : null), [years.length, yearReview, year])
  const scenes = useMemo(() => (review ? buildScenes(review) : []), [review])

  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | null>(null)

  const close = () => navigate('/year-in-review')
  const next = () => setI((n) => (n + 1 < scenes.length ? n + 1 : n))
  const prev = () => setI((n) => Math.max(0, n - 1))

  const scene = scenes[i]
  const onFinale = scene?.finale

  useEffect(() => {
    if (!scene || paused || onFinale) return
    timer.current = window.setTimeout(() => setI((n) => (n + 1 < scenes.length ? n + 1 : n)), SCENE_MS)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [i, paused, scene, onFinale, scenes.length])

  if (!review || scenes.length === 0) {
    return (
      <div className="recap-root light">
        <button className="recap-close" onClick={close} aria-label="Close"><Icon name="close" size={22} /></button>
        <div className="recap-scene"><p>Your recap is still being written — come back once your journey has a little history.</p></div>
      </div>
    )
  }

  const share = () => { void shareYearReview(review, isPremium) }

  return (
    <div className={`recap-root ${scene.tone}`}>
      {/* progress bars */}
      <div className="recap-bars">
        {scenes.map((_, idx) => (
          <div key={idx} className="recap-bar">
            <span className={`recap-bar-fill${idx < i ? ' done' : ''}${idx === i && !paused && !onFinale ? ' run' : ''}`} />
          </div>
        ))}
      </div>

      <button className="recap-close" onClick={close} aria-label="Close"><Icon name="close" size={22} /></button>

      {/* tap zones */}
      <button className="recap-tap left" onClick={prev} aria-label="Previous"
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />
      <button className="recap-tap right" onClick={next} aria-label="Next"
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />

      {/* scene content (keyed so the entrance animation replays each step) */}
      <div className="recap-scene" key={i}>
        <BrandMark size={30} />
        {scene.kicker && <div className="recap-kicker">{scene.kicker}</div>}
        {scene.stat && <div className="recap-stat">{scene.stat}</div>}
        <div className="recap-lines">
          {scene.lines.map((l, k) => (
            <div key={k} className="recap-line" style={{ animationDelay: `${120 + k * 90}ms` }}>{l}</div>
          ))}
        </div>

        {onFinale && (
          <div className="recap-actions">
            <button className="btn" onClick={share}><Icon name="share" size={17} /> Share my {review.year}</button>
            <button className="btn ghost recap-done" onClick={close}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
