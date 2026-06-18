import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { MilestoneSheet } from '../components/MilestoneSheet'
import { Sheet } from '../components/Sheet'
import { REACTIONS } from '../constants'
import { timeAgo } from '../utils/format'
import type { Reaction, TimelineEventType } from '../types'

const TYPE_ICON: Record<TimelineEventType, string> = {
  milestone: '🎯',
  comment: '💬',
  reaction: '❤️',
  moment: '✨',
  reflection: '📝',
  level: '🏆',
}

export function Timeline() {
  const navigate = useNavigate()
  const {
    currentUser,
    activeRelationships,
    buddyOf,
    state,
    reactToTimeline,
    commentOnTimeline,
    addReflection,
  } = useStore()
  const rels = activeRelationships()
  const [activeRelId, setActiveRelId] = useState(rels[0]?.id ?? '')
  const [milestoneOpen, setMilestoneOpen] = useState(false)
  const [reflectionOpen, setReflectionOpen] = useState(false)
  const [reflectionText, setReflectionText] = useState('')
  const [comment, setComment] = useState('')

  if (rels.length === 0) {
    return (
      <div className="screen">
        <TopBar title="Timeline" />
        <div className="empty">
          <div className="big">🌱</div>
          <h3>Your shared journey starts here</h3>
          <p>Match with a buddy to build a timeline of milestones, reflections and moments together.</p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/matches')}>
            Find my buddy
          </button>
        </div>
      </div>
    )
  }

  const rel = rels.find((r) => r.id === activeRelId) ?? rels[0]
  const buddy = buddyOf(rel)
  const events = state.timeline
    .filter((e) => e.relationshipId === rel.id)
    .sort((a, b) => b.createdAt - a.createdAt)

  const submitReflection = () => {
    addReflection(rel.id, reflectionText)
    setReflectionText('')
    setReflectionOpen(false)
  }

  const submitComment = () => {
    commentOnTimeline(rel.id, comment)
    setComment('')
  }

  const nameFor = (id: string) => (id === currentUser?.id ? 'You' : buddy.profile.nickname)

  return (
    <div className="screen">
      <TopBar title="Timeline" />

      {rels.length > 1 && (
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {rels.map((r) => (
            <button
              key={r.id}
              className={`chip ${r.id === rel.id ? 'primary' : ''}`}
              onClick={() => setActiveRelId(r.id)}
            >
              {buddyOf(r).profile.nickname}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={buddy.profile.nickname} size={44} />
        <div style={{ flex: 1 }}>
          <strong>You &amp; {buddy.profile.nickname}</strong>
          <div className="muted" style={{ fontSize: 13 }}>Your shared journey</div>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className="btn secondary" onClick={() => setMilestoneOpen(true)}>🎯 Milestone</button>
        <button className="btn secondary" onClick={() => setReflectionOpen(true)}>📝 Reflection</button>
      </div>

      <div className="banner info" style={{ marginBottom: 18 }}>
        🌱 Your timeline is what makes this a long-term friendship — a place to look back on how far you've come together.
      </div>

      {events.length === 0 ? (
        <div className="empty">No events yet. Add a milestone to begin!</div>
      ) : (
        <div className="timeline">
          {events.map((e) => (
            <div className="tl-item" key={e.id}>
              <div className="tl-dot">{TYPE_ICON[e.type]}</div>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="row between">
                  <strong style={{ fontSize: 14 }}>{nameFor(e.authorId)}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>{timeAgo(e.createdAt)}</span>
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--ink)', fontSize: 14 }}>
                  {e.type === 'reflection' && <span className="chip" style={{ marginRight: 6 }}>Monthly reflection</span>}
                  {e.text}
                </p>
                {e.reactions.length > 0 && (
                  <div className="chip-row" style={{ marginTop: 8 }}>
                    {e.reactions.map((r, i) => (
                      <span key={i} className="bubble-react-chip">{r}</span>
                    ))}
                  </div>
                )}
                <div className="react-bar" style={{ marginTop: 8 }}>
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      className="react-btn"
                      style={{ opacity: e.reactions.includes(r as Reaction) ? 1 : 0.45 }}
                      onClick={() => reactToTimeline(e.id, r as Reaction)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Add a comment to the timeline…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
          />
          <button className="btn sm" disabled={!comment.trim()} onClick={submitComment}>Post</button>
        </div>
      </div>

      <MilestoneSheet open={milestoneOpen} onClose={() => setMilestoneOpen(false)} relationshipId={rel.id} />

      <Sheet open={reflectionOpen} onClose={() => setReflectionOpen(false)}>
        <h2>Monthly reflection 📝</h2>
        <p style={{ marginTop: 4 }}>How has this month felt? What are you proud of? What's been hard?</p>
        <textarea
          className="input"
          value={reflectionText}
          placeholder="This month I…"
          onChange={(e) => setReflectionText(e.target.value)}
        />
        <button className="btn" style={{ marginTop: 12 }} disabled={!reflectionText.trim()} onClick={submitReflection}>
          Share reflection
        </button>
      </Sheet>
    </div>
  )
}
