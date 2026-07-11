import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { MilestoneSheet } from '../components/MilestoneSheet'
import { Icon } from '../components/Icon'
import { timeAgo } from '../utils/format'
import { CHECKIN_OPTIONS } from '../constants'
import type { BuddyRelationship, CheckinStatus } from '../types'

export function BuddyHome() {
  const navigate = useNavigate()
  const {
    currentUser,
    activeRelationships,
    buddyOf,
    daysConnected,
    buddyLevels,
    state,
    sendEncouragement,
    postCheckin,
    requestSupport,
    latestCheckin,
    buddyMemories,
    journeyCapsule,
    trioEligibility,
    activeTrio,
  } = useStore()
  const rels = activeRelationships()
  const [milestoneFor, setMilestoneFor] = useState<string | null>(null)
  const [encouraged, setEncouraged] = useState<string | null>(null)
  const [supportSent, setSupportSent] = useState(false)
  // Buddy cards start collapsed — just name + medication — so the page is easy
  // to scan. Tap the header (or the caret) to reveal the full space.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string, cur: boolean) => setExpanded((e) => ({ ...e, [id]: !cur }))

  const greet = `Hi ${currentUser?.profile.nickname}`
  const todayWeekday = new Date().getDay()
  const myCheckin = currentUser ? latestCheckin(currentUser.id) : null

  const encourage = (rel: BuddyRelationship) => {
    sendEncouragement(rel.id)
    setEncouraged(rel.id)
    setTimeout(() => setEncouraged(null), 2200)
  }

  const checkin = (status: CheckinStatus) => postCheckin(status)

  const askForSupport = () => {
    requestSupport()
    setSupportSent(true)
    setTimeout(() => setSupportSent(false), 3000)
  }

  return (
    <div className="screen">
      <TopBar title={greet} />

      {rels.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 14 }}>How are you feeling today?</div>
          {myCheckin ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Shared today: <strong>{CHECKIN_OPTIONS.find((o) => o.status === myCheckin.status)?.label}</strong>. Tap to update.
            </p>
          ) : (
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Your buddies will see this and can send support.</p>
          )}
          <div className="chip-row" style={{ marginTop: 8 }}>
            {CHECKIN_OPTIONS.map((o) => (
              <button
                key={o.status}
                className={`chip checkin-chip ${o.tone}${myCheckin?.status === o.status ? ' selected' : ''}`}
                onClick={() => checkin(o.status)}
              >
                <span className={`dot ${o.tone}`} />{o.label}
              </button>
            ))}
          </div>
          <button className="btn ghost gets-it" style={{ marginTop: 12 }} onClick={askForSupport}>
            <Icon name="heart" size={16} /> I need someone who gets it
          </button>
          {supportSent && (
            <div className="banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', marginTop: 10 }}>
              Your buddies have been let know you could use some support.
            </div>
          )}
        </div>
      )}

      {rels.length === 0 ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="users" size={30} /></div>
          <h3>Your buddy space is waiting</h3>
          <p>Once you and someone match, you'll get a private shared space here.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/matches')}>
            Find my buddy
          </button>
        </div>
      ) : (
        rels.map((rel) => {
          const buddy = buddyOf(rel)
          const days = daysConnected(rel)
          const levels = buddyLevels(rel)
          const unlocked = levels.filter((l) => l.unlocked)
          const recentMs = state.milestones
            .filter((m) => m.relationshipId === rel.id)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
          const buddyToday = latestCheckin(buddy.id)
          const buddyStatus = buddyToday && CHECKIN_OPTIONS.find((o) => o.status === buddyToday.status)
          const injectionToday = buddy.profile.injectionWeekday === todayWeekday
          const memories = buddyMemories(rel)
          const capsule = journeyCapsule(rel)
          // With a single buddy the card defaults open (nothing to hide); with
          // several, they default collapsed so the list stays scannable.
          const isOpen = expanded[rel.id] ?? rels.length === 1

          return (
            <div className="card" key={rel.id}>
              <button
                className="buddy-head"
                onClick={() => toggle(rel.id, isOpen)}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${buddy.profile.nickname}'s space`}
              >
                <Avatar name={buddy.profile.nickname} size={56} src={buddy.profile.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{buddy.profile.nickname}</h3>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {buddy.profile.medication}
                  </div>
                </div>
                <span className="chip green">Buddy</span>
                <span className={`expand-caret${isOpen ? ' open' : ''}`} aria-hidden>›</span>
              </button>

              {!isOpen ? null : (<>
              <div className="stat-grid" style={{ marginTop: 14, marginBottom: 14 }}>
                <div className="stat">
                  <div className="num">{days}</div>
                  <div className="lbl">Days connected</div>
                </div>
                <div className="stat">
                  <div className="num">{unlocked.length}</div>
                  <div className="lbl">Buddy levels</div>
                </div>
                <div className="stat">
                  <div className="num">{state.milestones.filter((m) => m.relationshipId === rel.id).length}</div>
                  <div className="lbl">Milestones</div>
                </div>
              </div>

              {injectionToday && (
                <div className="banner" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)', marginBottom: 12 }}>
                  Today is {buddy.profile.nickname}'s injection day — send some encouragement.
                </div>
              )}

              {buddyStatus && (
                <div className="card flat row" style={{ marginBottom: 12, gap: 10 }}>
                  <span className={`dot ${buddyStatus.tone}`} style={{ width: 12, height: 12 }} />
                  <div style={{ flex: 1, fontSize: 14 }}>
                    {buddy.profile.nickname} is feeling: <strong>{buddyStatus.label}</strong> today.
                  </div>
                  {buddyStatus.tone === 'rough' && (
                    <button className="btn sm" onClick={() => encourage(rel)}>Support</button>
                  )}
                </div>
              )}

              {memories.length > 0 && (
                <div className="card flat" style={{ marginBottom: 12, background: 'var(--accent-soft)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>ON THIS DAY</div>
                  {memories.map((m, i) => (
                    <p key={i} style={{ margin: '6px 0 0', fontSize: 14 }}>{m}</p>
                  ))}
                </div>
              )}

              <div className="card flat" style={{ marginBottom: 14 }}>
                <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>CURRENT JOURNEY STAGE</div>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  <span className="chip primary">You · {currentUser?.profile.treatmentStage}</span>
                  <span className="chip">{buddy.profile.nickname} · {buddy.profile.treatmentStage}</span>
                </div>
              </div>

              <div className="card flat capsule list-tap" style={{ marginBottom: 14 }} onClick={() => navigate('/capsule')}>
                <div className="row between">
                  <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>JOURNEY CAPSULE · {capsule.label.toUpperCase()}</div>
                  <span style={{ fontWeight: 800, color: 'var(--primary-ink)' }}>›</span>
                </div>
                <div className="capsule-grid" style={{ marginTop: 8 }}>
                  <div><strong>{capsule.monthsTogether}</strong><span>months together</span></div>
                  <div><strong>{capsule.milestones}</strong><span>milestones</span></div>
                  <div><strong>{capsule.messages}</strong><span>messages</span></div>
                  <div><strong>{capsule.photos}</strong><span>photos</span></div>
                </div>
                {capsule.biggestWin && (
                  <p style={{ margin: '10px 0 0', fontSize: 14 }}>Biggest win: <strong>{capsule.biggestWin}</strong></p>
                )}
                {capsule.favoriteMemory && (
                  <p style={{ margin: '4px 0 0', fontSize: 14 }} className="muted">“{capsule.favoriteMemory}”</p>
                )}
              </div>

              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Recent milestones</div>
              {recentMs.length === 0 ? (
                <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
                  No milestones yet — add your first to kick off the timeline.
                </p>
              ) : (
                <div className="stack" style={{ marginBottom: 6 }}>
                  {recentMs.map((m) => (
                    <div key={m.id} className="row" style={{ gap: 10 }}>
                      <span className="ms-badge"><Icon name="spark" size={15} /></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.type}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.authorId === currentUser?.id ? 'You' : buddy.profile.nickname} · {timeAgo(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {unlocked.length > 0 && (
                <div className="chip-row" style={{ marginTop: 10 }}>
                  {unlocked.map((l) => (
                    <span key={l.key} className="chip accent">{l.label}</span>
                  ))}
                </div>
              )}

              {encouraged === rel.id && (
                <div className="banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', marginTop: 12 }}>
                  Encouragement sent to {buddy.profile.nickname}.
                </div>
              )}

              <div className="btn-row" style={{ marginTop: 14 }}>
                <button className="btn" onClick={() => navigate(`/chat/${rel.id}`)}><Icon name="chat" size={17} /> Chat</button>
                <button className="btn secondary" onClick={() => setMilestoneFor(rel.id)}>Add milestone</button>
              </div>
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => encourage(rel)}>
                Send encouragement
              </button>
              <button className="btn ghost" style={{ marginTop: 2 }} onClick={() => navigate('/timeline')}>
                View shared timeline →
              </button>
              </>)}
            </div>
          )
        })
      )}

      {/* The Coach */}
      <div className="card list-tap" onClick={() => navigate('/coach')} style={{ background: 'var(--surface-2)' }}>
        <div className="row">
          <span className="row-ico"><Icon name="spark" size={22} /></span>
          <div style={{ flex: 1 }}>
            <strong>Talk to your Coach</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              Wellness &amp; motivation, any time — never medical advice.
            </div>
          </div>
          <span style={{ fontWeight: 800, color: 'var(--primary-ink)' }}>›</span>
        </div>
      </div>

      {/* Buddy Trio teaser */}
      <TrioTeaser
        eligible={trioEligibility().eligible}
        active={!!activeTrio()}
        onOpen={() => navigate('/trio')}
      />

      {milestoneFor && (
        <MilestoneSheet open onClose={() => setMilestoneFor(null)} relationshipId={milestoneFor} />
      )}
    </div>
  )
}

function TrioTeaser({ eligible, active, onOpen }: { eligible: boolean; active: boolean; onOpen: () => void }) {
  return (
    <div
      className="card list-tap"
      onClick={onOpen}
      style={{ background: active ? 'var(--primary-soft)' : 'var(--surface-2)' }}
    >
      <div className="row">
        <span className="row-ico"><Icon name={active ? 'users' : eligible ? 'spark' : 'lock'} size={22} /></span>
        <div style={{ flex: 1 }}>
          <strong>Buddy Trio</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {active
              ? 'Your three-person support group is active.'
              : eligible
              ? 'You\'ve unlocked Buddy Trio! Tap to create one.'
              : 'A small group of three. Unlocks for highly engaged users.'}
          </div>
        </div>
        <span style={{ fontWeight: 800, color: 'var(--primary-ink)' }}>›</span>
      </div>
    </div>
  )
}
