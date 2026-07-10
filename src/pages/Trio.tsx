import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { TopBar } from '../components/TopBar'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { REACTIONS, TRIO_MIN_ACCOUNT_AGE_DAYS } from '../constants'
import { clockTime, timeAgo } from '../utils/format'
import type { Reaction } from '../types'

export function Trio() {
  const navigate = useNavigate()
  const {
    currentUser,
    state,
    activeTrio,
    pendingTrio,
    activeRelationships,
    buddyOf,
    trioEligibility,
    createTrio,
    simulateTrioEligibility,
  } = useStore()

  const trio = activeTrio()
  const pending = pendingTrio()
  const elig = trioEligibility()

  return (
    <div className="screen">
      <TopBar title="Buddy Trio" back />

      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-soft), var(--accent-soft))' }}>
        <div className="row">
          <span className="row-ico" style={{ width: 46, height: 46 }}><Icon name="users" size={24} /></span>
          <div>
            <h2>Buddy Trio</h2>
            <p style={{ margin: 0, fontSize: 13 }}>A small, tight-knit support group of exactly three.</p>
          </div>
        </div>
      </div>

      {trio ? (
        <TrioSpace trioId={trio.id} />
      ) : pending ? (
        <PendingTrio trioId={pending.id} members={pending.memberIds} pending={pending.pendingMemberIds} />
      ) : elig.eligible ? (
        <CreateTrio
          buddies={activeRelationships().map((r) => buddyOf(r))}
          onCreate={(ids) => createTrio(ids)}
        />
      ) : (
        <LockedTrio
          checks={elig.checks}
          onSimulate={simulateTrioEligibility}
          onFindBuddy={() => navigate('/matches')}
        />
      )}

      {/* reference state to keep current user in scope for personalization */}
      <p className="muted center" style={{ fontSize: 12, marginTop: 6 }}>
        {currentUser?.profile.nickname}, Trio is designed for your most consistent support circle.
        {state.trios.length === 0 ? '' : ''}
      </p>
    </div>
  )
}

function LockedTrio({
  checks,
  onSimulate,
  onFindBuddy,
}: {
  checks: { label: string; met: boolean }[]
  onSimulate: () => void
  onFindBuddy: () => void
}) {
  return (
    <>
      <div className="banner info" style={{ marginBottom: 16 }}>
        Buddy Trio unlocks only for highly engaged users with a stable buddy history.
        It's about depth, not speed.
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Your eligibility</h3>
        <div className="stack">
          {checks.map((c) => (
            <div className="row" key={c.label} style={{ gap: 10 }}>
              <span className="lp-check" data-met={c.met}>{c.met && <Icon name="check" size={13} />}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: c.met ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          You need to be active for at least {TRIO_MIN_ACCOUNT_AGE_DAYS} days with a stable buddy
          relationship and consistent engagement.
        </p>
      </div>

      <button className="btn secondary" onClick={onFindBuddy}>Build a stable buddy relationship →</button>

      <div className="card flat" style={{ marginTop: 14, background: 'var(--surface-2)' }}>
        <strong style={{ fontSize: 13 }}>For reviewers / demo</strong>
        <p style={{ fontSize: 13, marginTop: 4 }}>
          Skip the 3-month wait and preview the unlocked Trio creation flow.
        </p>
        <button className="btn outline sm" onClick={onSimulate}>Simulate eligibility</button>
      </div>
    </>
  )
}

function CreateTrio({
  buddies,
  onCreate,
}: {
  buddies: { id: string; profile: { nickname: string } }[]
  onCreate: (ids: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev,
    )

  if (buddies.length < 2) {
    return (
      <div className="card">
        <div className="banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', marginBottom: 12 }}>
          You're eligible for Buddy Trio.
        </div>
        <p>You need at least two active buddies to form a Trio. Match with one more buddy first.</p>
      </div>
    )
  }

  return (
    <>
      <div className="banner" style={{ background: 'var(--green-soft)', color: 'var(--green)', marginBottom: 16 }}>
        You're eligible! Invite two of your buddies to form a Trio.
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Pick two buddies ({selected.length}/2)</h3>
        <div className="stack">
          {buddies.map((b) => (
            <button
              key={b.id}
              className="row list-tap"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 14,
                border: `2px solid ${selected.includes(b.id) ? 'var(--primary)' : 'var(--line)'}`,
                background: selected.includes(b.id) ? 'var(--primary-soft)' : 'transparent',
              }}
              onClick={() => toggle(b.id)}
            >
              <Avatar name={b.profile.nickname} size={38} />
              <span style={{ fontWeight: 700, flex: 1, textAlign: 'left' }}>{b.profile.nickname}</span>
              <span className="lp-check" data-met={selected.includes(b.id)}>{selected.includes(b.id) && <Icon name="check" size={13} />}</span>
            </button>
          ))}
        </div>
      </div>
      <button className="btn" disabled={selected.length !== 2} onClick={() => onCreate(selected)}>
        Invite to Buddy Trio
      </button>
      <p className="muted center" style={{ fontSize: 12 }}>All three of you must approve to create the Trio.</p>
    </>
  )
}

function PendingTrio({ trioId, members, pending }: { trioId: string; members: string[]; pending: string[] }) {
  const { state, currentUser, approveTrio } = useStore()
  const myApprovalPending = !!currentUser && pending.includes(currentUser.id)
  return (
    <div className="card center">
      <div className="empty-ico" style={{ margin: '0 auto 8px' }}><Icon name="clock" size={28} /></div>
      <h3>{myApprovalPending ? 'You have a Trio invite' : 'Waiting for approvals'}</h3>
      <p>Your Trio is created once all three members approve. Hang tight!</p>
      <div className="stack" style={{ marginTop: 10, textAlign: 'left' }}>
        {members.map((id) => (
          <div className="row" key={id}>
            <Avatar name={state.users[id]?.profile.nickname ?? '?'} size={34} />
            <span style={{ flex: 1, fontWeight: 700 }}>{state.users[id]?.profile.nickname}</span>
            <span className="chip green">Approved</span>
          </div>
        ))}
        {pending.map((id) => (
          <div className="row" key={id}>
            <Avatar name={state.users[id]?.profile.nickname ?? '?'} size={34} />
            <span style={{ flex: 1, fontWeight: 700 }}>
              {currentUser?.id === id ? 'You' : state.users[id]?.profile.nickname}
            </span>
            <span className="chip accent">Pending</span>
          </div>
        ))}
      </div>
      {myApprovalPending && (
        <button className="btn" style={{ marginTop: 14 }} onClick={() => approveTrio(trioId)}>
          Approve & join Trio
        </button>
      )}
    </div>
  )
}

function TrioSpace({ trioId }: { trioId: string }) {
  const { state, currentUser, sendTrioMessage, reactToTrioMessage } = useStore()
  const [tab, setTab] = useState<'chat' | 'timeline'>('chat')
  const [text, setText] = useState('')
  const [reactFor, setReactFor] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const trio = state.trios.find((t) => t.id === trioId)!
  const msgs = state.trioMessages
    .filter((m) => m.trioId === trioId)
    .sort((a, b) => a.createdAt - b.createdAt)

  // Shared milestones: aggregate milestones from across members' journeys.
  const sharedMilestones = state.milestones
    .filter((m) => trio.memberIds.includes(m.authorId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)

  useEffect(() => {
    if (tab === 'chat') bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight)
  }, [msgs.length, tab])

  const nameFor = (id: string) =>
    id === currentUser?.id ? 'You' : state.users[id]?.profile.nickname ?? '?'

  const send = () => {
    sendTrioMessage(trioId, text)
    setText('')
  }

  return (
    <>
      <div className="card">
        <div className="row between">
          <strong>Members</strong>
          <span className="chip primary">3 buddies</span>
        </div>
        <div className="row" style={{ marginTop: 10, gap: 6 }}>
          {trio.memberIds.map((id) => (
            <div key={id} className="center" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Avatar name={state.users[id]?.profile.nickname ?? '?'} size={44} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{nameFor(id)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        <button className={`chip ${tab === 'chat' ? 'primary' : ''}`} onClick={() => setTab('chat')}>Group chat</button>
        <button className={`chip ${tab === 'timeline' ? 'primary' : ''}`} onClick={() => setTab('timeline')}>Shared milestones</button>
      </div>

      {tab === 'chat' ? (
        <>
          <div className="card" ref={bodyRef} style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {msgs.length === 0 && (
              <div className="center muted" style={{ padding: 20 }}>
                <div className="empty-ico" style={{ margin: '0 auto 8px' }}><Icon name="chat" size={26} /></div>
                Welcome to your Trio! Say hello to the group.
              </div>
            )}
            {msgs.map((m) => {
              const mine = m.senderId === currentUser?.id
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  {!mine && <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>{nameFor(m.senderId)}</div>}
                  <div className={`bubble ${mine ? 'mine' : 'theirs'}`} onClick={() => setReactFor(reactFor === m.id ? null : m.id)}>
                    {m.text}
                    <div className="time">{clockTime(m.createdAt)}</div>
                    {m.reactions.length > 0 && (
                      <div className="bubble-reactions">
                        {m.reactions.map((r, i) => <span key={i} className="bubble-react-chip">{r}</span>)}
                      </div>
                    )}
                  </div>
                  {reactFor === m.id && (
                    <div className="react-bar">
                      {REACTIONS.map((r) => (
                        <button key={r} className="react-btn" style={{ opacity: m.reactions.includes(r as Reaction) ? 1 : 0.5 }} onClick={() => reactToTrioMessage(m.id, r as Reaction)}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Message the trio…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn sm" disabled={!text.trim()} onClick={send}>Send</button>
          </div>
        </>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Shared milestones</h3>
          {sharedMilestones.length === 0 ? (
            <p className="muted">No milestones yet. As any member logs milestones, they'll appear here for the whole Trio to celebrate.</p>
          ) : (
            <div className="stack">
              {sharedMilestones.map((m) => (
                <div className="row" key={m.id} style={{ gap: 10 }}>
                  <span className="ms-badge"><Icon name="spark" size={15} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.type}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{nameFor(m.authorId)} · {timeAgo(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
