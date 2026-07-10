// ===========================================================================
// Production data layer — every server operation the app needs, backed by
// Supabase with Row Level Security. The local demo store (AppStore.tsx) mirrors
// this surface in-memory; flipping VITE_BACKEND=supabase routes through here.
// ===========================================================================
import { requireSupabase, supabase } from '../lib/supabase'
import type {
  ApprovalRow,
  MessageRow,
  MilestoneRow,
  NotificationRow,
  ProfileRow,
  RelationshipRow,
  TimelineEventRow,
  TrioMemberRow,
  TrioMessageRow,
  TrioRow,
} from '../lib/database.types'
import type { Profile } from '../types'

// ---- Auth -----------------------------------------------------------------
export const auth = {
  async signUp(email: string, password: string, nickname: string) {
    const sb = requireSupabase()
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      // Send any confirmation link back to wherever the app runs (e.g.
      // https://glpenpal.com) so the session is picked up on return.
      options: { data: { nickname }, emailRedirectTo: window.location.origin },
    })
    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    const sb = requireSupabase()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async sendMagicLink(email: string) {
    const sb = requireSupabase()
    const { error } = await sb.auth.signInWithOtp({ email })
    if (error) throw error
  },

  // Email a password-reset link that returns to this site (PASSWORD_RECOVERY).
  async resetPassword(email: string) {
    const sb = requireSupabase()
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  },

  // Set a new password for the currently-authenticated (recovery) session.
  async updatePassword(password: string) {
    const sb = requireSupabase()
    const { error } = await sb.auth.updateUser({ password })
    if (error) throw error
  },

  // Fires when the user arrives via a password-reset link.
  onPasswordRecovery(cb: () => void) {
    if (!supabase) return () => {}
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') cb()
    })
    return () => data.subscription.unsubscribe()
  },

  // Permanently delete the user's account + all their data (RPC cascades via
  // auth.users → profiles → everything). Requires migration 0006.
  async deleteAccount() {
    const sb = requireSupabase()
    const { error } = await sb.rpc('delete_own_account')
    if (error) throw error
    try { await sb.auth.signOut() } catch { /* session already gone */ }
  },

  async signOut() {
    await supabase?.auth.signOut()
  },

  async currentUserId(): Promise<string | null> {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  },

  onAuthChange(cb: (userId: string | null) => void) {
    if (!supabase) return () => {}
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      cb(session?.user?.id ?? null)
    })
    return () => data.subscription.unsubscribe()
  },
}

// ---- Profiles -------------------------------------------------------------
function profileToRow(p: Profile): Partial<ProfileRow> {
  return {
    nickname: p.nickname,
    age_range: p.ageRange,
    gender: p.gender,
    gender_preference: p.genderPreference,
    language: p.language,
    country: p.country,
    medication: p.medication,
    treatment_stage: p.treatmentStage,
    current_weight_range: p.currentWeightRange,
    goal_weight_range: p.goalWeightRange,
    main_goal: p.mainGoal,
    communication_preference: p.communicationPreference,
    bio: p.bio,
    interests: p.interests,
    avatar_url: p.avatarUrl ?? null,
  }
}

export const profiles = {
  async get(id: string): Promise<ProfileRow | null> {
    const sb = requireSupabase()
    const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },

  // Update profile fields without touching onboarding/safety flags — used by
  // the single-page profile editor.
  async update(id: string, p: Profile): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb.from('profiles').update(profileToRow(p)).eq('id', id)
    if (error) throw error
  },

  async saveOnboarding(id: string, p: Profile): Promise<void> {
    const sb = requireSupabase()
    // Editable profile columns are writable directly; onboarding_complete is a
    // privileged flag set only via the SECURITY DEFINER RPC (migration 0010).
    const { error } = await sb.from('profiles').update(profileToRow(p)).eq('id', id)
    if (error) throw error
    const { error: rpcErr } = await sb.rpc('mark_onboarding_complete')
    if (rpcErr) throw rpcErr
  },

  async acceptSafety(_id: string, termsVersion: string): Promise<void> {
    const sb = requireSupabase()
    // accepted_safety / age_confirmed / terms_version are privileged compliance
    // flags — set only through the RPC, never a client column write.
    const { error } = await sb.rpc('accept_safety', { p_terms_version: termsVersion })
    if (error) throw error
  },

  // Bounded, minimized match-discovery pool (SECURITY DEFINER RPC — excludes
  // staff/compliance columns and users you've passed/blocked). Ranking is
  // computed client-side in scoreMatch.
  async candidates(_excludeId: string): Promise<ProfileRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('discover_candidates', { p_limit: 200 })
    if (error) throw error
    // The RPC omits compliance/staff columns; fill neutral defaults so the row
    // still satisfies ProfileRow for the mappers (these fields are unused for
    // other users in the UI).
    return (data ?? []).map((r: Record<string, unknown>) => ({
      accepted_safety: true,
      age_confirmed: true,
      terms_version: null,
      is_staff: false,
      ended_relationship_count: 0,
      updated_at: (r.created_at as string) ?? new Date(0).toISOString(),
      ...r,
    })) as ProfileRow[]
  },

  // Full profiles for people the caller is connected to (buddies, pending
  // approvals, trio co-members) — allowed by the can_view_profile RLS policy.
  async related(ids: string[]): Promise<ProfileRow[]> {
    if (ids.length === 0) return []
    const sb = requireSupabase()
    const { data, error } = await sb.from('profiles').select('*').in('id', ids)
    if (error) throw error
    return data ?? []
  },
}

// ---- Matching -------------------------------------------------------------
export const matching = {
  // Atomic mutual-match: see supabase/migrations/0002_match_rpc.sql.
  async approveBuddy(targetId: string): Promise<string | null> {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('approve_buddy', { target: targetId })
    if (error) throw error
    return (data as string | null) ?? null
  },

  async pass(fromId: string, targetId: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('match_approvals')
      .upsert({ from_user: fromId, to_user: targetId, status: 'passed' })
    if (error) throw error
  },

  // Every approval involving the user (sent or received), any status.
  async allForUser(userId: string): Promise<ApprovalRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('match_approvals')
      .select('*')
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
    if (error) throw error
    return data ?? []
  },

  async incoming(userId: string): Promise<ApprovalRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('match_approvals')
      .select('*')
      .eq('to_user', userId)
      .eq('status', 'pending')
    if (error) throw error
    return data ?? []
  },

  async outgoing(userId: string): Promise<ApprovalRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('match_approvals')
      .select('*')
      .eq('from_user', userId)
      .eq('status', 'pending')
    if (error) throw error
    return data ?? []
  },
}

// ---- Relationships --------------------------------------------------------
export const relationships = {
  async active(userId: string): Promise<RelationshipRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('relationships')
      .select('*')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .eq('active', true)
    if (error) throw error
    return data ?? []
  },

  async end(relationshipId: string, reason: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('relationships')
      .update({ active: false, end_reason: reason })
      .eq('id', relationshipId)
    if (error) throw error
  },

  async setLevels(relationshipId: string, levelKeys: string[]): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('relationships')
      .update({ level_keys: levelKeys })
      .eq('id', relationshipId)
    if (error) throw error
  },
}

// ---- Messages / milestones / timeline ------------------------------------
export const chat = {
  async list(relationshipId: string): Promise<MessageRow[]> {
    const sb = requireSupabase()
    // Most-recent window, returned in ascending order for the chat view. Avoids
    // re-downloading an unbounded photo history (images are inline data URLs)
    // on every hydrate.
    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw error
    return (data ?? []).reverse()
  },

  async send(relationshipId: string, senderId: string, text: string, imageUrl?: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('messages')
      .insert({ relationship_id: relationshipId, sender_id: senderId, text: text || null, image_url: imageUrl ?? null })
    if (error) throw error
  },

  // Atomic toggle server-side (migration 0010) so concurrent reactors can't
  // clobber each other's reactions with a read-modify-write of the whole array.
  async toggleReaction(messageId: string, reaction: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb.rpc('toggle_message_reaction', {
      p_message: messageId,
      p_reaction: reaction,
    })
    if (error) throw error
  },

  // Realtime: invoke cb whenever a message lands for this relationship.
  subscribe(relationshipId: string, cb: (m: MessageRow) => void) {
    const sb = requireSupabase()
    const channel = sb
      .channel(`messages:${relationshipId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `relationship_id=eq.${relationshipId}` },
        (payload) => cb(payload.new as MessageRow),
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  },

  // Realtime across all of the user's chats: fires on new messages AND on
  // reaction updates (RLS limits delivery to the user's own relationships).
  // Powers instant, refresh-free chat like any messaging app.
  subscribeAll(cb: (m: MessageRow) => void) {
    const sb = requireSupabase()
    const channel = sb
      .channel('messages-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new && (payload.new as MessageRow).id) cb(payload.new as MessageRow)
        },
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  },
}

export const milestones = {
  async list(relationshipId: string): Promise<MilestoneRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('milestones')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },

  async add(relationshipId: string, authorId: string, type: string, note: string): Promise<MilestoneRow> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('milestones')
      .insert({ relationship_id: relationshipId, author_id: authorId, type, note })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const timeline = {
  async list(relationshipId: string): Promise<TimelineEventRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('timeline_events')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async addEvent(
    relationshipId: string,
    authorId: string,
    type: string,
    text: string,
    refId?: string,
  ): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb.from('timeline_events').insert({
      relationship_id: relationshipId,
      author_id: authorId,
      type,
      text,
      ref_id: refId ?? null,
    })
    if (error) throw error
  },

  async toggleReaction(eventId: string, reaction: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb.rpc('toggle_timeline_reaction', {
      p_event: eventId,
      p_reaction: reaction,
    })
    if (error) throw error
  },
}

// ---- Notifications --------------------------------------------------------
export const notifications = {
  async list(userId: string): Promise<NotificationRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data ?? []
  },

  async markAllRead(userId: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
  },

  // Mark just the notifications pointing at a given link (e.g. one chat) read.
  async markReadByLink(userId: string, link: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('link', link)
      .eq('read', false)
    if (error) throw error
  },

  subscribe(userId: string, cb: (n: NotificationRow) => void) {
    const sb = requireSupabase()
    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => cb(payload.new as NotificationRow),
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  },
}

// ---- Trust & safety -------------------------------------------------------
export const safety = {
  async report(reporterId: string, targetUserId: string, reason: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('reports_blocks')
      .insert({ reporter_id: reporterId, target_user_id: targetUserId, kind: 'report', reason })
    if (error) throw error
  },

  async block(reporterId: string, targetUserId: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('reports_blocks')
      .insert({ reporter_id: reporterId, target_user_id: targetUserId, kind: 'block', reason: 'Blocked' })
    if (error) throw error
  },
}

// ---- Buddy Trio -----------------------------------------------------------
export const trios = {
  async create(creatorId: string, buddyIds: string[]): Promise<TrioRow> {
    const sb = requireSupabase()
    const { data: trio, error } = await sb
      .from('trios')
      .insert({ created_by: creatorId, active: false })
      .select()
      .single()
    if (error) throw error
    const members = [
      { trio_id: trio.id, user_id: creatorId, approved: true },
      ...buddyIds.map((id) => ({ trio_id: trio.id, user_id: id, approved: false })),
    ]
    const { error: mErr } = await sb.from('trio_members').insert(members)
    if (mErr) throw mErr
    return trio
  },

  async members(trioId: string): Promise<TrioMemberRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb.from('trio_members').select('*').eq('trio_id', trioId)
    if (error) throw error
    return data ?? []
  },

  // All trios (active + pending) the user belongs to, with their members.
  async mine(userId: string): Promise<{ trio: TrioRow; members: TrioMemberRow[] }[]> {
    const sb = requireSupabase()
    const { data: rows, error } = await sb
      .from('trio_members')
      .select('trio_id')
      .eq('user_id', userId)
    if (error) throw error
    const ids = [...new Set((rows ?? []).map((r) => r.trio_id))]
    const out: { trio: TrioRow; members: TrioMemberRow[] }[] = []
    for (const id of ids) {
      const { data: trio } = await sb.from('trios').select('*').eq('id', id).maybeSingle()
      if (trio) out.push({ trio, members: await this.members(id) })
    }
    return out
  },

  async reactToMessage(messageId: string, reaction: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb.rpc('toggle_trio_reaction', {
      p_message: messageId,
      p_reaction: reaction,
    })
    if (error) throw error
  },

  // Approve the caller's own membership; the RPC activates the trio once every
  // member has approved (activation is server-side so a non-creator's final
  // approval doesn't fail the trios UPDATE policy).
  async approve(trioId: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb.rpc('approve_trio_membership', { p_trio: trioId })
    if (error) throw error
  },

  async messages(trioId: string): Promise<TrioMessageRow[]> {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('trio_messages')
      .select('*')
      .eq('trio_id', trioId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },

  async send(trioId: string, senderId: string, text: string): Promise<void> {
    const sb = requireSupabase()
    const { error } = await sb
      .from('trio_messages')
      .insert({ trio_id: trioId, sender_id: senderId, text })
    if (error) throw error
  },
}
