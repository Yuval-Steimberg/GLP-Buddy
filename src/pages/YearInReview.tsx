import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { BrandMark, Icon } from '../components/Icon'
import { Reveal } from '../components/Reveal'
import { shareYearReview } from '../lib/shareCards'

// Year in Review — a shareable end-of-year recap across all of your buddies.
// Free and built to be shared (the viral growth loop).
export function YearInReview() {
  const navigate = useNavigate()
  const { currentUser, reviewYears, yearReview } = useStore()
  const years = reviewYears()
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear())
  const [busy, setBusy] = useState(false)

  if (!currentUser || years.length === 0) {
    return (
      <div className="screen">
        <TopBar title="Year in Review" back />
        <div className="empty">
          <div className="empty-ico"><Icon name="spark" size={30} /></div>
          <h3>Your year is still being written</h3>
          <p>Match with a buddy and log a few milestones — your Year in Review appears once your journey has some history.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/matches')}>Find my buddy</button>
        </div>
      </div>
    )
  }

  const review = yearReview(year)

  const share = async () => {
    setBusy(true)
    try {
      await shareYearReview(review, true)
    } catch {
      /* cancelled / unsupported — no-op */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <TopBar title="Year in Review" back />

      {years.length > 1 && (
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {years.map((y) => (
            <button key={y} className={`chip ${y === year ? 'primary' : ''}`} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Hero — mirrors the shareable card. */}
      <Reveal>
      <div className="jb-cover yir-cover">
        <div className="jb-cover-head">
          <BrandMark size={28} />
          <div className="jb-kicker">MY GLP JOURNEY {review.year}</div>
        </div>
        <div className="yir-name">{review.meName}</div>
        {review.journeyStart && (
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            On the journey since {new Date(review.journeyStart).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
        <div className="jb-stats" style={{ marginTop: 16 }}>
          <div><strong>{review.daysOnJourney}</strong><span>days in</span></div>
          <div><strong>{review.milestones}</strong><span>milestones</span></div>
          <div><strong>{review.messages}</strong><span>messages</span></div>
          <div><strong>{review.buddies}</strong><span>{review.buddies === 1 ? 'buddy' : 'buddies'}</span></div>
        </div>

        {(review.kgLost != null || review.toughWeeks > 0 || review.strongestMonth) && (
          <div className="yir-highlights">
            {review.kgLost != null && (
              <div className="yir-hl">
                <span className="yir-hl-num">{review.kgLost} kg</span>
                <span>lost this year</span>
              </div>
            )}
            {review.toughWeeks > 0 && (
              <div className="yir-hl">
                <span className="yir-hl-num">{review.toughWeeks}</span>
                <span>tough week{review.toughWeeks === 1 ? '' : 's'} overcome</span>
              </div>
            )}
            {review.strongestMonth && (
              <div className="yir-hl">
                <span className="yir-hl-num">{review.strongestMonth}</span>
                <span>strongest month</span>
              </div>
            )}
          </div>
        )}

        {review.topMilestone && (
          <div className="jb-top" style={{ marginTop: 16 }}>
            <span className="jb-top-label">Biggest milestone</span>
            {review.topMilestone}
          </div>
        )}

        {review.favoriteEncouragement && (
          <div className="yir-quote">
            <span className="jb-top-label">A message that stayed with you</span>
            “{review.favoriteEncouragement}”
          </div>
        )}
      </div>
      </Reveal>

      <Reveal delay={80}>
        <button className="btn yir-recap-btn" style={{ marginTop: 16 }} onClick={() => navigate(`/recap?year=${review.year}`)}>
          <Icon name="spark" size={17} /> Play your {review.year} recap
        </button>
        <button className="btn ghost" style={{ marginTop: 8 }} disabled={busy} onClick={share}>
          <Icon name="share" size={17} /> {busy ? 'Preparing…' : `Share my ${review.year}`}
        </button>
        <p className="muted center" style={{ fontSize: 12, marginTop: 8 }}>
          Shares a recap image — no names or health details.
        </p>
      </Reveal>
    </div>
  )
}
