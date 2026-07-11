import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { BrandMark, Icon } from '../components/Icon'
import type { JourneyCapsule } from '../types'

const DAY = 86400000

// A dedicated, shareable monthly recap for a buddy pair. Browse past months and
// export the capsule as an image to share.
export function Capsule() {
  const navigate = useNavigate()
  const { currentUser, activeRelationships, buddyOf, journeyCapsule } = useStore()
  const rels = activeRelationships()
  const [relId, setRelId] = useState(rels[0]?.id ?? '')
  const [monthsAgo, setMonthsAgo] = useState(0)
  const [busy, setBusy] = useState(false)

  const rel = rels.find((r) => r.id === relId) ?? rels[0]

  // How many whole months back can we browse (down to the month they matched)?
  const maxBack = useMemo(() => {
    if (!rel) return 0
    const start = new Date(rel.createdAt)
    const now = new Date()
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
  }, [rel])

  if (!currentUser || !rel) {
    return (
      <div className="screen">
        <TopBar title="Journey Capsule" back />
        <div className="empty">
          <div className="empty-ico"><Icon name="spark" size={30} /></div>
          <h3>No capsule yet</h3>
          <p>Match with a buddy to start building your monthly journey capsules.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/matches')}>Find my buddy</button>
        </div>
      </div>
    )
  }

  const buddy = buddyOf(rel)
  const cap = journeyCapsule(rel, monthsAgo)
  const meName = currentUser.profile.nickname
  const daysTogether = Math.max(0, Math.floor((Date.now() - rel.createdAt) / DAY))

  const share = async () => {
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      drawCapsule(canvas, { cap, meName, buddyName: buddy.profile.nickname })
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
      if (!blob) return
      const file = new File([blob], 'journey-capsule.png', { type: 'image/png' })
      const shareData = { files: [file], title: 'Our Journey Capsule', text: `Our GLPenPal Journey Capsule — ${cap.label}` }
      // deno-lint-ignore no-explicit-any
      const nav = navigator as any
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share(shareData)
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'journey-capsule.png'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* user cancelled or unsupported — no-op */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <TopBar title="Journey Capsule" back />

      {rels.length > 1 && (
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {rels.map((r) => (
            <button
              key={r.id}
              className={`chip ${r.id === rel.id ? 'primary' : ''}`}
              onClick={() => { setRelId(r.id); setMonthsAgo(0) }}
            >
              {buddyOf(r).profile.nickname}
            </button>
          ))}
        </div>
      )}

      {/* Month navigator */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <button className="icon-btn" disabled={monthsAgo >= maxBack} onClick={() => setMonthsAgo((m) => m + 1)} aria-label="Previous month">‹</button>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{cap.label}</strong>
        <button className="icon-btn" disabled={monthsAgo <= 0} onClick={() => setMonthsAgo((m) => m - 1)} aria-label="Next month">›</button>
      </div>

      {/* The capsule card (what gets shared, mirrored on screen) */}
      <div className="capsule-card">
        <div className="capsule-head">
          <BrandMark size={30} />
          <div>
            <div className="capsule-kicker">JOURNEY CAPSULE</div>
            <div className="capsule-month">{cap.label}</div>
          </div>
        </div>

        <div className="capsule-pair">
          <Avatar name={meName} size={40} src={currentUser.profile.avatarUrl} />
          <div className="capsule-heart"><Icon name="heart" size={16} /></div>
          <Avatar name={buddy.profile.nickname} size={40} src={buddy.profile.avatarUrl} />
          <div style={{ flex: 1 }}>
            <strong>{meName} &amp; {buddy.profile.nickname}</strong>
            <div className="muted" style={{ fontSize: 12 }}>{daysTogether} days together</div>
          </div>
        </div>

        <div className="capsule-stats">
          <div><strong>{cap.monthsTogether}</strong><span>months together</span></div>
          <div><strong>{cap.milestones}</strong><span>milestones</span></div>
          <div><strong>{cap.messages}</strong><span>messages</span></div>
          <div><strong>{cap.photos}</strong><span>photos</span></div>
        </div>

        {cap.biggestWin ? (
          <div className="capsule-line"><span className="capsule-label">Biggest win</span>{cap.biggestWin}</div>
        ) : (
          <div className="capsule-line muted">Log a milestone this month to capture a biggest win.</div>
        )}
        {cap.favoriteMemory && (
          <div className="capsule-line"><span className="capsule-label">Favourite memory</span>“{cap.favoriteMemory}”</div>
        )}

        <div className="capsule-foot">GLPenPal · a glp buddy who gets it</div>
      </div>

      <button className="btn" style={{ marginTop: 16 }} disabled={busy} onClick={share}>
        <Icon name="share" size={17} /> {busy ? 'Preparing…' : 'Share this capsule'}
      </button>
      <p className="muted center" style={{ fontSize: 12, marginTop: 8 }}>
        Shares an image — no names or health details beyond what you see here.
      </p>
    </div>
  )
}

// Render the capsule to a portrait PNG for sharing.
function drawCapsule(
  canvas: HTMLCanvasElement,
  { cap, meName, buddyName }: { cap: JourneyCapsule; meName: string; buddyName: string },
) {
  const W = 1080
  const H = 1350
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  // Background
  ctx.fillStyle = '#f4f1e8'
  ctx.fillRect(0, 0, W, H)

  // Heart mark (top center) via SVG Path2D
  const OUTER = 'M50,83 C50,83 15,57 15,39 C15,29 24,24 31,24 C39,24 46,30 50,38 C54,30 61,24 69,24 C76,24 85,29 85,39 C85,57 50,83 50,83 Z'
  const INNER = 'M50,71 C50,71 28,53 28,42 C28,35 33,32 38,32 C43,32 47,36 50,41 C53,36 57,32 62,32 C67,32 72,35 72,42 C72,53 50,71 50,71 Z'
  ctx.save()
  ctx.translate(W / 2 - 120, 110)
  ctx.scale(2.4, 2.4)
  const band = new Path2D(`${OUTER} ${INNER}`)
  ctx.save(); ctx.beginPath(); ctx.rect(-2, -2, 52, 104); ctx.clip(); ctx.fillStyle = '#5e8c74'; ctx.fill(band, 'evenodd'); ctx.restore()
  ctx.save(); ctx.beginPath(); ctx.rect(50, -2, 52, 104); ctx.clip(); ctx.fillStyle = '#5f8497'; ctx.fill(band, 'evenodd'); ctx.restore()
  ctx.fillStyle = '#5e8c74'; ctx.beginPath(); ctx.arc(31.5, 19, 9, 0, 7); ctx.fill()
  ctx.fillStyle = '#5f8497'; ctx.beginPath(); ctx.arc(68.5, 19, 9, 0, 7); ctx.fill()
  ctx.restore()

  const cx = W / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = '#436b57'
  ctx.font = '700 34px Inter, sans-serif'
  ctx.fillText('JOURNEY CAPSULE', cx, 470)
  ctx.fillStyle = '#1e2a25'
  ctx.font = '700 64px "Space Grotesk", Inter, sans-serif'
  ctx.fillText(String(cap.label), cx, 545)
  ctx.font = '600 40px Inter, sans-serif'
  ctx.fillStyle = '#1e2a25'
  ctx.fillText(`${meName} & ${buddyName}`, cx, 630)

  // Stats row
  const stats: [string, string][] = [
    [String(cap.monthsTogether), 'months'],
    [String(cap.milestones), 'milestones'],
    [String(cap.messages), 'messages'],
    [String(cap.photos), 'photos'],
  ]
  const colW = W / 4
  stats.forEach(([num, lbl], i) => {
    const x = colW * i + colW / 2
    ctx.fillStyle = '#436b57'
    ctx.font = '700 72px "Space Grotesk", Inter, sans-serif'
    ctx.fillText(num, x, 800)
    ctx.fillStyle = '#56635c'
    ctx.font = '600 28px Inter, sans-serif'
    ctx.fillText(lbl, x, 845)
  })

  let y = 960
  const wrap = (label: string, text: string) => {
    ctx.fillStyle = '#c2955f'
    ctx.font = '700 28px Inter, sans-serif'
    ctx.fillText(label.toUpperCase(), cx, y)
    y += 46
    ctx.fillStyle = '#1e2a25'
    ctx.font = '500 36px Inter, sans-serif'
    // simple word-wrap
    const words = text.split(' ')
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > W - 160 && line) {
        ctx.fillText(line, cx, y); y += 46; line = w
      } else line = test
    }
    ctx.fillText(line, cx, y)
    y += 70
  }
  if (cap.biggestWin) wrap('Biggest win', String(cap.biggestWin))
  if (cap.favoriteMemory) wrap('Favourite memory', `“${cap.favoriteMemory}”`)

  ctx.fillStyle = '#56635c'
  ctx.font = '600 30px Inter, sans-serif'
  ctx.fillText('GLPenPal · a glp buddy who gets it', cx, H - 70)
}
