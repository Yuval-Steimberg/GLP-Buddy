import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, TouchEvent as RTouchEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { REACTIONS, END_REASONS } from '../constants'
import { clockTime } from '../utils/format'
import { looksLikeMedicalAdvice } from '../utils/safety'
import { fileToChatImage, safeImageSrc } from '../lib/image'
import type { ChatMessage, Reaction } from '../types'

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
  const [sendingImg, setSendingImg] = useState(false)
  const [pending, setPending] = useState<string[]>([]) // compressed images awaiting send
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number; id: string } | null>(null)
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lpFired = useRef(false)

  const msgs = state.messages
    .filter((m) => m.relationshipId === relId)
    .sort((a, b) => a.createdAt - b.createdAt)

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight)
  }, [msgs.length])

  // Opening (or receiving a message in) this chat clears its unread dot. Also
  // re-run when a message notification for this chat arrives on its own realtime
  // channel (which isn't ordered relative to the message), so the dot can't
  // linger while you're staring at the chat.
  const unreadForChat = state.notifications.filter(
    (n) => n.link === `/chat/${relId}` && !n.read,
  ).length
  useEffect(() => {
    if (relId) markChatRead(relId)
  }, [relId, msgs.length, unreadForChat, markChatRead])

  if (!rel) return <Navigate to="/chat" />
  const buddy = buddyOf(rel)

  // A message can quote another (reply). Look up the quoted message + build a
  // short preview; author label; jump-to-original helper.
  const quotedOf = (m: ChatMessage) =>
    m.replyTo ? state.messages.find((x) => x.id === m.replyTo) : undefined
  const snippet = (m?: ChatMessage) =>
    !m ? 'Original message unavailable' : (m.text?.trim() || (m.imageUrl ? 'Photo' : ''))
  const authorOf = (senderId: string) => (senderId === currentUser?.id ? 'You' : buddy.profile.nickname)
  const scrollToMsg = (id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('msg-flash')
    setTimeout(() => el.classList.remove('msg-flash'), 1100)
  }

  const clearLongPress = () => {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null }
  }

  // Touch gestures on a bubble:
  //  • press-and-hold (~450ms) → open the reaction picker (WhatsApp-style)
  //  • swipe sideways → reply
  // Movement cancels the long-press so it can't fire while scrolling/swiping.
  const onTouchStart = (e: RTouchEvent, id: string) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, id }
    lpFired.current = false
    clearLongPress()
    lpTimer.current = setTimeout(() => {
      lpFired.current = true
      setReactFor(id)
      setSwipe(null)
      // deno-lint-ignore no-explicit-any
      const nav = navigator as any
      if (nav.vibrate) nav.vibrate(12)
    }, 450)
  }
  const onTouchMove = (e: RTouchEvent) => {
    const s = touchStart.current
    if (!s) return
    const t = e.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearLongPress() // a drag, not a hold
    if (Math.abs(dx) < Math.abs(dy) || dx < 0) return // vertical scroll / wrong way
    setSwipe({ id: s.id, dx: Math.min(72, dx) })
  }
  const onTouchEnd = () => {
    clearLongPress()
    const s = touchStart.current
    if (s && swipe && swipe.id === s.id && swipe.dx > 48) {
      const m = msgs.find((x) => x.id === s.id)
      if (m) setReplyTo(m)
    }
    touchStart.current = null
    setSwipe(null)
  }

  // Send: any queued photos go first (caption + reply ride on the last one),
  // then any remaining plain text.
  const send = () => {
    if (!rel) return
    const caption = text.trim()
    const rt = replyTo?.id
    if (pending.length > 0) {
      pending.forEach((img, i) => {
        const isLast = i === pending.length - 1
        sendMessage(rel.id, isLast ? caption : '', img, isLast ? rt : undefined)
      })
      setPending([])
      setText('')
      setReplyTo(null)
      return
    }
    if (!caption) return
    sendMessage(rel.id, caption, undefined, rt)
    setText('')
    setReplyTo(null)
  }

  // Compress the chosen photo(s) and queue them for review + caption.
  const addImages = async (files?: FileList | null) => {
    if (!files || files.length === 0) return
    setSendingImg(true)
    try {
      const imgs = await Promise.all(Array.from(files).slice(0, 10).map((f) => fileToChatImage(f)))
      setPending((prev) => [...prev, ...imgs])
    } catch {
      alert('Sorry, that image could not be added. Try another photo.')
    } finally {
      setSendingImg(false)
    }
  }

  const canSend = pending.length > 0 || !!text.trim()

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
          const imgSrc = safeImageSrc(m.imageUrl)
          const quoted = quotedOf(m)
          const swiping = swipe?.id === m.id
          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className="msg-row"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: mine ? 'flex-end' : 'flex-start',
                transform: swiping ? `translateX(${swipe!.dx}px)` : undefined,
                transition: swiping ? 'none' : 'transform .18s ease',
              }}
              onTouchStart={(e) => onTouchStart(e, m.id)}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {swiping && <span className="swipe-reply-hint" style={{ [mine ? 'right' : 'left']: -34 } as CSSProperties}><Icon name="reply" size={16} /></span>}
              <div
                className={`bubble ${mine ? 'mine' : 'theirs'}${imgSrc ? ' has-img' : ''}`}
                onClick={() => {
                  // Swallow the click that trails a long-press (which already
                  // opened the picker) so it doesn't immediately toggle it shut.
                  if (lpFired.current) { lpFired.current = false; return }
                  setReactFor(reactFor === m.id ? null : m.id)
                }}
              >
                {m.replyTo && (
                  <div
                    className="bubble-quote"
                    onClick={(e) => { e.stopPropagation(); scrollToMsg(m.replyTo!) }}
                  >
                    <span className="bubble-quote-name">{quoted ? authorOf(quoted.senderId) : ''}</span>
                    <span className="bubble-quote-text">{snippet(quoted)}</span>
                  </div>
                )}
                {imgSrc && (
                  <img
                    className="bubble-img"
                    src={imgSrc}
                    alt="Shared"
                    onClick={(e) => { e.stopPropagation(); setLightbox(imgSrc) }}
                  />
                )}
                {m.text}
                <div className="time">{clockTime(m.createdAt)}{m.failed && <span className="msg-failed"> · not sent</span>}</div>
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
                  <button
                    className="react-btn react-reply"
                    onClick={() => { setReplyTo(m); setReactFor(null) }}
                    aria-label="Reply to this message"
                  >
                    <Icon name="reply" size={16} />
                  </button>
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
      {/* Photo compose tray: thumbnails of queued images, each removable. */}
      {pending.length > 0 && (
        <div className="compose-tray">
          {pending.map((img, i) => (
            <div className="compose-thumb" key={i}>
              <img src={img} alt="To send" />
              <button
                className="compose-rm"
                aria-label="Remove photo"
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
          <button className="compose-add" onClick={() => setAttachOpen(true)} aria-label="Add another photo">
            <Icon name="plus" size={20} />
          </button>
        </div>
      )}

      {replyTo && (
        <div className="reply-preview">
          <span className="reply-preview-bar" />
          <div className="reply-preview-body">
            <span className="reply-preview-name">Replying to {authorOf(replyTo.senderId)}</span>
            <span className="reply-preview-text">{snippet(replyTo)}</span>
          </div>
          <button className="reply-preview-x" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="chat-input">
        <button
          className="attach"
          onClick={() => setAttachOpen(true)}
          disabled={sendingImg}
          aria-label="Add a photo"
        >
          <Icon name={sendingImg ? 'clock' : 'plus'} size={20} />
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => { addImages(e.target.files); e.target.value = '' }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { addImages(e.target.files); e.target.value = '' }}
        />
        <input
          className="input"
          placeholder={pending.length > 0 ? 'Add a caption…' : `Message ${buddy.profile.nickname}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="send" onClick={send} disabled={!canSend} aria-label="Send"><Icon name="send" size={18} /></button>
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Shared" />
        </div>
      )}

      {/* Add a photo: camera or gallery */}
      <Sheet open={attachOpen} onClose={() => setAttachOpen(false)}>
        <h2>Add a photo</h2>
        <p style={{ marginTop: 4 }}>Share a moment with {buddy.profile.nickname}.</p>
        <div className="stack" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => { setAttachOpen(false); cameraRef.current?.click() }}>
            <Icon name="camera" size={18} /> Take a photo
          </button>
          <button className="btn secondary" onClick={() => { setAttachOpen(false); galleryRef.current?.click() }}>
            <Icon name="image" size={18} /> Choose from gallery
          </button>
        </div>
      </Sheet>

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
