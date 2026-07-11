import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Icon } from '../components/Icon'
import { looksLikeMedicalAdvice } from '../utils/safety'
import * as api from '../services/api'
import { USE_SUPABASE } from '../lib/env'

type Turn = { role: 'user' | 'assistant'; content: string }

// Render **bold** inline; leave everything else as text.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/)
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{part}</span>
  })
}

// Lightweight formatter for the Coach's replies: paragraphs, bullet lists and
// bold — so we don't show raw markdown (**, -) in the bubble.
function CoachText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  let key = 0
  const flush = () => {
    if (list.length) {
      const items = list
      blocks.push(
        <ul key={key++} className="coach-list">
          {items.map((li, i) => <li key={i}>{inline(li)}</li>)}
        </ul>,
      )
      list = []
    }
  }
  for (const raw of text.split('\n')) {
    const bullet = raw.match(/^\s*[-*]\s+(.*)/)
    if (bullet) { list.push(bullet[1]); continue }
    flush()
    if (raw.trim() === '') continue
    blocks.push(<p key={key++} className="coach-p">{inline(raw)}</p>)
  }
  flush()
  return <>{blocks}</>
}

const GREETING =
  "Hi, I'm your Coach — here for the day-to-day of your GLP journey. Motivation, habits, the rough days, the wins. I can't help with dosing or symptoms (that's for your clinician), but I'm always up for a chat. How are you doing today?"

// The Coach: a wellness/habits companion. Peer-support only — never medical
// advice. Conversation is private to you and not stored.
export function Coach() {
  const navigate = useNavigate()
  const { currentUser } = useStore()
  const [turns, setTurns] = useState<Turn[]>([{ role: 'assistant', content: GREETING }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight)
  }, [turns.length, busy])

  const send = async () => {
    const q = text.trim()
    if (!q || busy) return
    const next: Turn[] = [...turns, { role: 'user', content: q }]
    setTurns(next)
    setText('')
    setBusy(true)
    try {
      if (!USE_SUPABASE) {
        // Demo mode has no backend; give a safe, on-brand canned reply.
        await new Promise((r) => setTimeout(r, 500))
        setTurns((t) => [...t, { role: 'assistant', content: "I'm just a demo here, but in the live app I'm your wellness cheerleader — never medical advice. You're doing great by showing up." }])
        return
      }
      const reply = await api.coach.ask(next.map((m) => ({ role: m.role, content: m.content })))
      setTurns((t) => [...t, { role: 'assistant', content: reply }])
    } catch {
      setTurns((t) => [...t, { role: 'assistant', content: "Sorry — I couldn't reach the Coach just now. Please try again in a moment." }])
    } finally {
      setBusy(false)
    }
  }

  const flagged = looksLikeMedicalAdvice(text)

  return (
    <div className="chat-wrap coach">
      <div className="chat-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <span className="row-ico" style={{ width: 40, height: 40 }}><Icon name="spark" size={20} /></span>
        <div style={{ flex: 1 }}>
          <strong>The Coach</strong>
          <div className="muted" style={{ fontSize: 12 }}>Wellness &amp; habits · not medical advice</div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        <div className="banner warn" style={{ marginBottom: 6 }}>
          The Coach is peer-support and wellness only — <strong>not medical advice</strong>. For
          dosing, medication, or symptoms, contact your clinician; in an emergency, your local
          emergency services.
        </div>

        {turns.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={`bubble ${m.role === 'user' ? 'mine' : 'theirs'}`}>
              {m.role === 'assistant' ? <CoachText text={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="bubble theirs muted">…</div>
          </div>
        )}
      </div>

      {flagged && (
        <div className="banner warn" style={{ margin: '0 14px 8px' }}>
          That looks like a dosing or medical question — the Coach will point you to your clinician.
        </div>
      )}

      <div className="chat-input">
        <input
          className="input"
          placeholder={`Talk to your Coach, ${currentUser?.profile.nickname ?? 'friend'}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={busy}
        />
        <button className="send" onClick={send} disabled={busy || !text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
      </div>
    </div>
  )
}
