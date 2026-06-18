import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { MilestoneSheet } from '../components/MilestoneSheet'
import { MILESTONE_EMOJI } from '../constants'
import { timeAgo } from '../utils/format'
import type { BuddyRelationship } from '../types'

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
    trioEligibility,
    activeTrio,
  } = useStore()
  const rels = activeRelationships()
  const [milestoneFor, setMilestoneFor] = useState<string | null>(null)
  const [encouraged, setEncouraged] = useState<string | null>(null)

  const greet = `Hi ${currentUser?.profile.nickname} 👋`

  const encourage = (rel: BuddyRelationship) => {
    sendEncouragement(rel.id)
    setEncouraged(rel.id)
    setTimeout(() => setEncouraged(null), 2200)
  }

  return (
    <div className="screen">
      <TopBar title={greet} />

      {rels.length === 0 ? (
        <div className="empty">
          <div className="big">🫂</div>
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

          return (
            <div className="card" key={rel.id}>
              <div className="row" style={{ marginBottom: 14 }}>
                <Avatar name={buddy.profile.nickname} size={56} />
                <div style={{ flex: 1 }}>
                  <h3>{buddy.profile.nickname}</h3>
                  <div className="muted" style={{ fontSize: 13 }}>
                    💊 {buddy.profile.medication}
                  </div>
                </div>
                <span className="chip green">Buddy</span>
              </div>

              <div className="stat-grid" style={{ marginBottom: 14 }}>
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

              <div className="card flat" style={{ marginBottom: 14 }}>
                <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>CURRENT JOURNEY STAGE</div>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  <span className="chip primary">You · {currentUser?.profile.treatmentStage}</span>
                  <span className="chip">{buddy.profile.nickname} · {buddy.profile.treatmentStage}</span>
                </div>
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
                      <span style={{ fontSize: 20 }}>{MILESTONE_EMOJI[m.type]}</span>
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
                    <span key={l.key} className="chip accent">{l.emoji} {l.label}</span>
                  ))}
                </div>
              )}

              {encouraged === rel.id && (
                <div className="banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', marginTop: 12 }}>
                  💛 Encouragement sent to {buddy.profile.nickname}!
                </div>
              )}

              <div className="btn-row" style={{ marginTop: 14 }}>
                <button className="btn" onClick={() => navigate(`/chat/${rel.id}`)}>💬 Chat</button>
                <button className="btn secondary" onClick={() => setMilestoneFor(rel.id)}>＋ Milestone</button>
              </div>
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => encourage(rel)}>
                💛 Send encouragement
              </button>
              <button className="btn ghost" style={{ marginTop: 2 }} onClick={() => navigate('/timeline')}>
                View shared timeline →
              </button>
            </div>
          )
        })
      )}

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
        <span style={{ fontSize: 28 }}>{active ? '👥' : eligible ? '🎉' : '🔒'}</span>
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
