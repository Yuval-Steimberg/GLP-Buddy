import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Icon } from '../components/Icon'
import { DataSkeleton } from '../components/AppLoading'
import { timeAgo } from '../utils/format'
import { USE_SUPABASE } from '../lib/env'
import * as api from '../services/api'
import type { AdminOverview, AdminReport, AdminUser, AppState } from '../types'

const DAY = 86400000
type Tab = 'overview' | 'users' | 'reports'

// Staff admin dashboard. Data comes from is_staff-gated SECURITY DEFINER RPCs
// in Supabase mode (migration 0017), or is derived from the local demo state
// in local mode (so it's demoable + screenshot-testable).
export function Moderation() {
  const navigate = useNavigate()
  const { state } = useStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(USE_SUPABASE)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [signups, setSignups] = useState<{ day: string; count: number }[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])

  const demo = useMemo(() => computeDemo(state), [state])

  useEffect(() => {
    if (!USE_SUPABASE) {
      setOverview(demo.overview); setSignups(demo.signups); setUsers(demo.users); setReports(demo.reports)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const [ov, su, us, rp] = await Promise.all([
          api.admin.overview(), api.admin.signupsDaily(), api.admin.users(), api.admin.reports(),
        ])
        if (cancelled) return
        setOverview(ov as AdminOverview)
        setSignups(su)
        setUsers(us.map(mapUser))
        setReports(rp.map(mapReport))
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? 'Failed to load admin data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [demo])

  const toggleResolved = async (r: AdminReport) => {
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, resolved: !x.resolved } : x)))
    if (USE_SUPABASE) {
      try { await api.admin.resolveReport(r.id, !r.resolved) } catch { /* revert on failure */
        setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, resolved: r.resolved } : x)))
      }
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? users.filter((u) => u.nickname.toLowerCase().includes(q)) : users
  }, [users, search])

  return (
    <div className="screen no-nav">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <span className="title" style={{ fontSize: 18 }}>Admin</span>
        <div className="spacer" />
      </div>

      <div className="admin-tabs">
        {(['overview', 'users', 'reports'] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'users' ? `Users${overview ? ` · ${overview.users_total}` : ''}` : `Reports${overview && overview.reports_open ? ` · ${overview.reports_open}` : ''}`}
          </button>
        ))}
      </div>

      {error && <div className="banner" style={{ background: '#fbeaea', color: '#a1352f', marginBottom: 12 }}>{error}</div>}
      {loading && <DataSkeleton />}

      {!loading && tab === 'overview' && overview && (
        <>
          <div className="admin-grid">
            <Stat label="Total users" value={overview.users_total} sub={`+${overview.users_7d} this week`} />
            <Stat label="New (30d)" value={overview.users_30d} />
            <Stat label="Onboarded" value={overview.onboarded} />
            <Stat label="Active pairs" value={overview.pairs_active} sub={`${overview.pairs_total} total`} />
            <Stat label="Messages" value={overview.messages_total} sub={`+${overview.messages_7d} this week`} />
            <Stat label="Milestones" value={overview.milestones_total} />
            <Stat label="Check-ins (7d)" value={overview.checkins_7d} />
            <Stat label="Open reports" value={overview.reports_open} sub={`${overview.reports_total} total`} tone={overview.reports_open ? 'warn' : undefined} />
          </div>

          {signups.length > 0 && (
            <div className="card" style={{ marginTop: 4 }}>
              <div className="admin-h">New users · last 30 days</div>
              <SignupBars data={signups} />
            </div>
          )}
        </>
      )}

      {!loading && tab === 'users' && (
        <>
          <input className="input" placeholder="Search by nickname…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
          {filteredUsers.length === 0 ? (
            <p className="muted center" style={{ marginTop: 24 }}>No users.</p>
          ) : (
            <div className="stack">
              {filteredUsers.map((u) => (
                <div key={u.id} className="admin-user">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <strong>{u.nickname || '—'}</strong>
                      {u.isStaff && <span className="admin-badge staff">staff</span>}
                      {u.isPremium && <span className="admin-badge premium">premium</span>}
                      {!u.onboardingComplete && <span className="admin-badge muted">onboarding</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {u.medication}{u.treatmentStage ? ` · ${u.treatmentStage}` : ''}{u.country ? ` · ${u.country}` : ''}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: 11, textAlign: 'right' }}>
                    joined<br />{new Date(u.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="muted center" style={{ fontSize: 11, marginTop: 12 }}>Showing up to 200 most-recent users. Full data + destructive actions live in the Supabase dashboard.</p>
        </>
      )}

      {!loading && tab === 'reports' && (
        reports.length === 0 ? (
          <div className="empty"><div className="empty-ico"><Icon name="check" size={30} /></div><h3>Queue is clear</h3><p>No reports or blocks to review.</p></div>
        ) : (
          <div className="stack">
            {reports.map((r) => (
              <div className={`card admin-report${r.resolved ? ' resolved' : ''}`} key={r.id}>
                <div className="row between">
                  <strong>{r.kind === 'block' ? 'Block' : 'Report'}{r.resolved ? ' · resolved' : ''}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>{timeAgo(r.createdAt)}</span>
                </div>
                <p style={{ fontSize: 14, margin: '6px 0 2px' }}>
                  <span className="muted">{r.reporterNick}</span> → <strong>{r.targetNick}</strong>
                </p>
                {r.reason && <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{r.reason}</p>}
                <button className={`btn sm ${r.resolved ? 'ghost' : 'secondary'}`} onClick={() => toggleResolved(r)}>
                  {r.resolved ? 'Reopen' : 'Mark resolved'}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: 'warn' }) {
  return (
    <div className={`admin-stat${tone === 'warn' ? ' warn' : ''}`}>
      <div className="admin-stat-num">{value.toLocaleString()}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  )
}

function SignupBars({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="admin-bars">
      {data.map((d) => (
        <div key={d.day} className="admin-bar" title={`${d.day}: ${d.count}`}>
          <span style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}

// ---- mappers (RPC snake_case rows → domain types) --------------------------
function mapUser(r: Record<string, unknown>): AdminUser {
  return {
    id: String(r.id), nickname: (r.nickname as string) ?? '', medication: (r.medication as string) ?? '',
    treatmentStage: (r.treatment_stage as string) ?? '', country: (r.country as string) ?? '',
    createdAt: Date.parse(r.created_at as string), onboardingComplete: !!r.onboarding_complete,
    isPremium: !!r.is_premium, isStaff: !!r.is_staff,
  }
}
function mapReport(r: Record<string, unknown>): AdminReport {
  return {
    id: String(r.id), kind: (r.kind as string) ?? 'report', reason: (r.reason as string) ?? '',
    resolved: !!r.resolved, createdAt: Date.parse(r.created_at as string),
    reporterId: String(r.reporter_id ?? ''), reporterNick: (r.reporter_nick as string) ?? '—',
    targetId: String(r.target_id ?? ''), targetNick: (r.target_nick as string) ?? '—',
  }
}

// ---- demo/local-mode derivation from the store state -----------------------
function computeDemo(state: AppState): { overview: AdminOverview; signups: { day: string; count: number }[]; users: AdminUser[]; reports: AdminReport[] } {
  const now = Date.now()
  const users = Object.values(state.users)
  const inLast = (ts: number, days: number) => ts > now - days * DAY
  const overview: AdminOverview = {
    users_total: users.length,
    users_7d: users.filter((u) => inLast(u.createdAt, 7)).length,
    users_30d: users.filter((u) => inLast(u.createdAt, 30)).length,
    onboarded: users.filter((u) => u.onboardingComplete).length,
    premium: users.filter((u) => u.isPremium).length,
    staff: users.filter((u) => u.isStaff).length,
    pairs_active: state.relationships.filter((r) => r.active).length,
    pairs_total: state.relationships.length,
    messages_total: state.messages.length,
    messages_7d: state.messages.filter((m) => inLast(m.createdAt, 7)).length,
    milestones_total: state.milestones.length,
    checkins_7d: state.checkins.filter((c) => inLast(c.createdAt, 7)).length,
    reports_open: state.reports.length,
    reports_total: state.reports.length,
  }
  const buckets = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY).toISOString().slice(0, 10)
    buckets.set(d, 0)
  }
  users.forEach((u) => {
    const d = new Date(u.createdAt).toISOString().slice(0, 10)
    if (buckets.has(d)) buckets.set(d, (buckets.get(d) ?? 0) + 1)
  })
  const signups = [...buckets.entries()].map(([day, count]) => ({ day, count }))
  const adminUsers: AdminUser[] = users
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((u) => ({
      id: u.id, nickname: u.profile.nickname, medication: u.profile.medication,
      treatmentStage: u.profile.treatmentStage, country: u.profile.country, createdAt: u.createdAt,
      onboardingComplete: u.onboardingComplete, isPremium: !!u.isPremium, isStaff: !!u.isStaff,
    }))
  const reports: AdminReport[] = [...state.reports]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => ({
      id: r.id, kind: r.kind, reason: r.reason, resolved: false, createdAt: r.createdAt,
      reporterId: r.reporterId, reporterNick: state.users[r.reporterId]?.profile.nickname ?? '—',
      targetId: r.targetUserId, targetNick: state.users[r.targetUserId]?.profile.nickname ?? '—',
    }))
  return { overview, signups, users: adminUsers, reports }
}
