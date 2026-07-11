// Hand-written row types mirroring supabase/migrations/0001_init.sql.
// In a real project regenerate with: `supabase gen types typescript`.

export interface ProfileRow {
  id: string
  nickname: string
  age_range: string | null
  gender: string | null
  gender_preference: string | null
  language: string | null
  country: string | null
  medication: string | null
  treatment_stage: string | null
  current_weight_range: string | null
  goal_weight_range: string | null
  main_goal: string | null
  communication_preference: string | null
  bio: string | null
  interests: string[]
  avatar_url: string | null
  accepted_safety: boolean
  age_confirmed: boolean
  terms_version: string | null
  is_staff: boolean
  onboarding_complete: boolean
  ended_relationship_count: number
  created_at: string
  updated_at: string
}

export interface ApprovalRow {
  id: string
  from_user: string
  to_user: string
  status: 'pending' | 'matched' | 'passed'
  created_at: string
}

export interface RelationshipRow {
  id: string
  user_a: string
  user_b: string
  active: boolean
  end_reason: string | null
  level_keys: string[]
  created_at: string
}

export interface MessageRow {
  id: string
  relationship_id: string
  sender_id: string
  text: string | null
  image_url: string | null
  reactions: string[]
  reply_to: string | null
  created_at: string
}

export interface MilestoneRow {
  id: string
  relationship_id: string
  author_id: string
  type: string
  note: string | null
  created_at: string
}

export interface TimelineEventRow {
  id: string
  relationship_id: string
  author_id: string
  type: string
  text: string
  image_url: string | null
  ref_id: string | null
  reactions: string[]
  created_at: string
}

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}

export interface ReportRow {
  id: string
  reporter_id: string
  target_user_id: string
  kind: 'report' | 'block'
  reason: string | null
  resolved: boolean
  created_at: string
}

export interface TrioRow {
  id: string
  created_by: string
  active: boolean
  created_at: string
}

export interface TrioMemberRow {
  trio_id: string
  user_id: string
  approved: boolean
}

export interface TrioMessageRow {
  id: string
  trio_id: string
  sender_id: string
  text: string
  reactions: string[]
  created_at: string
}
