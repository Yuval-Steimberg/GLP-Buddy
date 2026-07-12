import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { BrandMark, Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { USE_SUPABASE } from '../lib/env'
import { exportJourneyPdf } from '../lib/journeyExport'
import { shareJourneyCard } from '../lib/shareCards'

// The Journey Book — a month-by-month auto-written story of a buddy pair.
// Reading it is FREE (the retention hook: "don't lose your story"). Premium
// unlocks the keepsake exports (a designed PDF + a shareable image card).
export function JourneyBook() {
  const navigate = useNavigate()
  const { currentUser, activeRelationships, buddyOf, journeyBook, isPremium, setPremiumDemo } =
    useStore()
  const rels = activeRelationships()
  const [relId, setRelId] = useState(rels[0]?.id ?? '')
  const [busy, setBusy] = useState<'pdf' | 'card' | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  const rel = rels.find((r) => r.id === relId) ?? rels[0]

  if (!currentUser || !rel) {
    return (
      <div className="screen">
        <TopBar title="Journey Book" back />
        <div className="empty">
          <div className="empty-ico"><Icon name="doc" size={30} /></div>
          <h3>No story yet</h3>
          <p>Match with a buddy to start writing your Journey Book together.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/matches')}>Find my buddy</button>
        </div>
      </div>
    )
  }

  const buddy = buddyOf(rel)
  const book = journeyBook(rel)

  const doExport = async (kind: 'pdf' | 'card') => {
    if (!isPremium) { setShowPaywall(true); return }
    setBusy(kind)
    try {
      if (kind === 'pdf') await exportJourneyPdf(book)
      else await shareJourneyCard(book)
    } catch {
      /* cancelled / unsupported — no-op */
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="screen">
      <TopBar title="Journey Book" back />

      {rels.length > 1 && (
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {rels.map((r) => (
            <button
              key={r.id}
              className={`chip ${r.id === rel.id ? 'primary' : ''}`}
              onClick={() => setRelId(r.id)}
            >
              {buddyOf(r).profile.nickname}
            </button>
          ))}
        </div>
      )}

      {/* Cover — the shape that gets exported, mirrored on screen. */}
      <div className="jb-cover">
        <div className="jb-cover-head">
          <BrandMark size={28} />
          <div className="jb-kicker">THE JOURNEY BOOK</div>
        </div>
        <div className="jb-pair">
          <Avatar name={book.meName} size={38} src={currentUser.profile.avatarUrl} />
          <div className="jb-heart"><Icon name="heart" size={15} /></div>
          <Avatar name={buddy.profile.nickname} size={38} src={buddy.profile.avatarUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{book.meName} &amp; {book.buddyName}</strong>
            <div className="muted" style={{ fontSize: 12 }}>{book.totalDays} days together</div>
          </div>
        </div>
        <div className="jb-stats">
          <div><strong>{book.totalMonths}</strong><span>{book.totalMonths === 1 ? 'month' : 'months'}</span></div>
          <div><strong>{book.totalMilestones}</strong><span>milestones</span></div>
          <div><strong>{book.totalMessages}</strong><span>messages</span></div>
          <div><strong>{book.totalPhotos}</strong><span>photos</span></div>
        </div>
        {book.topMilestone && (
          <div className="jb-top">
            <span className="jb-top-label">Biggest milestone</span>
            {book.topMilestone}
          </div>
        )}
      </div>

      {/* Export actions — gated. */}
      <div className="jb-export">
        {isPremium ? (
          <>
            <button className="btn" disabled={busy !== null} onClick={() => doExport('pdf')}>
              <Icon name="download" size={17} /> {busy === 'pdf' ? 'Preparing…' : 'Download PDF keepsake'}
            </button>
            <button className="btn ghost" disabled={busy !== null} onClick={() => doExport('card')}>
              <Icon name="share" size={17} /> {busy === 'card' ? 'Preparing…' : 'Share a Journey card'}
            </button>
          </>
        ) : (
          <button className="jb-lock" onClick={() => setShowPaywall(true)}>
            <div className="jb-lock-ico"><Icon name="lock" size={18} /></div>
            <div className="jb-lock-copy">
              <strong>Keep your story forever</strong>
              <span>Export a beautiful PDF keepsake &amp; shareable cards with Premium.</span>
            </div>
            <Icon name="spark" size={18} />
          </button>
        )}
      </div>

      {/* The story, month by month — free to read. */}
      <div className="jb-section-title">Your story, month by month</div>
      <div className="jb-chapters">
        {book.chapters.map((ch) => (
          <div key={ch.key} className="jb-chapter">
            <div className="jb-ch-head">
              <span className="jb-ch-bar" />
              <strong>{ch.label}</strong>
              {ch.milestones > 0 && (
                <span className="jb-ch-badge"><Icon name="spark" size={12} /> {ch.milestones}</span>
              )}
            </div>
            {ch.story.map((line, i) => (
              <p key={i} className="jb-ch-line">{line}</p>
            ))}
          </div>
        ))}
      </div>

      <p className="muted center" style={{ fontSize: 12, marginTop: 16 }}>
        Your Journey Book is written automatically from your milestones and shared moments.
      </p>

      <PremiumSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onDemoUnlock={USE_SUPABASE ? undefined : () => { setPremiumDemo(true); setShowPaywall(false) }}
      />
    </div>
  )
}

// The Premium upsell. In demo/local mode it offers a one-tap preview so the
// unlocked experience is demoable; in Supabase mode billing isn't wired yet, so
// it invites the user to join the waitlist.
function PremiumSheet({
  open,
  onClose,
  onDemoUnlock,
}: {
  open: boolean
  onClose: () => void
  onDemoUnlock?: () => void
}) {
  const benefits = [
    'A designed PDF keepsake of your whole journey',
    'Shareable Journey cards for Instagram & Facebook',
    'Every milestone, saved forever',
    'New premium chapters as your story grows',
  ]
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="jb-pay-head">
        <div className="jb-pay-badge"><Icon name="spark" size={22} /></div>
        <h3>GLPenPal Premium</h3>
        <p className="muted">Turn your journey into something you can hold onto.</p>
      </div>
      <ul className="jb-pay-list">
        {benefits.map((b) => (
          <li key={b}><Icon name="check" size={16} /> {b}</li>
        ))}
      </ul>
      {onDemoUnlock ? (
        <button className="btn" onClick={onDemoUnlock}>
          <Icon name="spark" size={17} /> Preview Premium (demo)
        </button>
      ) : (
        <button className="btn" onClick={onClose}>
          <Icon name="heart" size={17} /> Notify me when Premium launches
        </button>
      )}
      <button className="btn ghost" onClick={onClose} style={{ marginTop: 8 }}>Maybe later</button>
    </Sheet>
  )
}
