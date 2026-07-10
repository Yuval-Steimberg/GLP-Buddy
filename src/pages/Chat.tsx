import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { REACTIONS, END_REASONS } from '../constants'
import { clockTime } from '../utils/format'
import { looksLikeMedicalAdvice } from '../utils/safety'
import type { Reaction } from '../types'

export function Chat() {
  const { relId } = useParams()
  const navigate = useNavigate()
  const {
    currentUser,
    state,
    activeRelationships,
    buddyOf,
    sendMessage,
    reactToMessage,
    reportUser,
    blockUser,
    endRelationship,
    markChatRead,
  } = useStore()

  const rel = activeRelationships().find((r) => r.id === relId)
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [reactFor, setReactFor] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const msgs = state.messages
    .filter((m) => m.relationshipId === relId)
    .sort((a, b) => a.createdAt - b.createdAt)

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight)
  }, [msgs.length])

  // Opening (or receiving a message in) this chat clears its unread dot.
  useEffect(() => {
    if (relId) markChatRead(relId)
  }, [relId, msgs.length, markChatRead])

  if (!rel) return <Navigate to="/chat" />
  const buddy = buddyOf(rel)

  const send = () => {
    sendMessage(rel.id, text)
    setText('')
  }

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <Avatar name={buddy.profile.nickname} size={40} src={buddy.profile.avatarUrl} />
        <div style={{ flex: 1 }}>
          <strong>{buddy.profile.nickname}</strong>
          <div className="muted" style={{ fontSize: 12 }}>{buddy.profile.medication} · {buddy.profile.treatmentStage}</div>
        </div>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Options">⋯</button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        <div className="banner warn" style={{ marginBottom: 6 }}>
          Friendly reminder: no dosing or medical advice. For symptoms, contact a clinician.
        </div>

        {msgs.length === 0 && (
          <div className="center muted" style={{ marginTop: 30 }}>
            <div className="empty-ico" style={{ margin: '0 auto 10px' }}><Icon name="chat" size={26} /></div>
            Say hi to {buddy.profile.nickname} and break the ice.
          </div>
        )}

        {msgs.map((m) => {
          const mine = m.senderId === currentUser?.id
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div
                className={`bubble ${mine ? 'mine' : 'theirs'}`}
                onClick={() => setReactFor(reactFor === m.id ? null : m.id)}
              >
                {m.text}
                <div className="time">{clockTime(m.createdAt)}</div>
                {m.reactions.length > 0 && (
                  <div className="bubble-reactions">
                    {m.reactions.map((r, i) => (
                      <span key={i} className="bubble-react-chip">{r}</span>
                    ))}
                  </div>
                )}
              </div>
              {reactFor === m.id && (
                <div className="react-bar">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      className="react-btn"
                      style={{ opacity: m.reactions.includes(r as Reaction) ? 1 : 0.5 }}
                      onClick={() => { reactToMessage(m.id, r as Reaction) }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {looksLikeMedicalAdvice(text) && (
        <div className="banner warn" style={{ margin: '0 14px 8px' }}>
          This looks like dosing or medical advice. Please keep it peer support —
          for medication questions, point your buddy to their clinician.
        </div>
      )}
      <div className="chat-input">
        <input
          className="input"
          placeholder={`Message ${buddy.profile.nickname}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="send" onClick={send} disabled={!text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
      </div>

      {/* Options menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <h2>{buddy.profile.nickname}</h2>
        <p style={{ marginTop: 4 }}>Manage this buddy relationship.</p>
        <div className="banner warn" style={{ marginBottom: 14 }}>
          Concerning symptoms? Contact a clinician or emergency services — not your buddy.
        </div>
        <button className="btn secondary" onClick={() => { setMenuOpen(false); setEndOpen(true) }}>
          End this buddy relationship
        </button>
        <button className="btn outline" style={{ marginTop: 8 }} onClick={() => { setMenuOpen(false); setReportOpen(true) }}>
          Report {buddy.profile.nickname}
        </button>
        <button
          className="btn danger"
          style={{ marginTop: 8 }}
          onClick={() => { blockUser(buddy.id); setMenuOpen(false); navigate('/chat') }}
        >
          Block {buddy.profile.nickname}
        </button>
      </Sheet>

      {/* Report */}
      <Sheet open={reportOpen} onClose={() => setReportOpen(false)}>
        <h2>Report {buddy.profile.nickname}</h2>
        <p style={{ marginTop: 4 }}>Reports go to our moderation team (placeholder for MVP).</p>
        <div className="stack">
          {['Inappropriate messages', 'Gave medical/dosing advice', 'Harassment', 'Spam or selling', 'Other'].map((r) => (
            <button
              key={r}
              className="btn secondary"
              onClick={() => { reportUser(buddy.id, r); setReportOpen(false) }}
            >
              {r}
            </button>
          ))}
        </div>
      </Sheet>

      {/* End relationship */}
      <Sheet open={endOpen} onClose={() => setEndOpen(false)}>
        <h2>End respectfully</h2>
        <p style={{ marginTop: 4 }}>No hard feelings — you can find a new buddy anytime.</p>
        <div className="stack">
          {END_REASONS.map((r) => (
            <button
              key={r}
              className="btn secondary"
              onClick={() => { endRelationship(rel.id, r); setEndOpen(false); navigate('/matches') }}
            >
              {r}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
