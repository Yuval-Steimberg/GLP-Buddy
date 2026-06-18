// ---------------------------------------------------------------------------
// GLP Buddy — core data models
// These mirror the tables/models an eventual backend would expose. For the MVP
// they live entirely client-side and are persisted to localStorage.
// ---------------------------------------------------------------------------

export type Medication =
  | 'Ozempic'
  | 'Wegovy'
  | 'Mounjaro'
  | 'Zepbound'
  | 'Saxenda'
  | 'Other'

export type TreatmentStage =
  | 'Considering GLP'
  | 'Not started yet'
  | 'First injection'
  | 'First month'
  | '1–3 months'
  | '3–6 months'
  | '6+ months'
  | 'Maintenance'

export type MainGoal =
  | 'Weight loss'
  | 'Maintenance'
  | 'Side effect support'
  | 'Motivation'
  | 'Emotional support'
  | 'Accountability'

export type CommunicationPreference =
  | 'Daily'
  | 'Few times a week'
  | 'Weekly'
  | 'Minimal'

export type GenderPreference = 'Same gender' | 'No preference' | 'Other'

export interface Profile {
  nickname: string
  ageRange: string
  gender: string
  genderPreference: GenderPreference
  language: string
  country: string
  medication: Medication
  treatmentStage: TreatmentStage
  currentWeightRange: string
  goalWeightRange: string
  mainGoal: MainGoal
  communicationPreference: CommunicationPreference
  bio: string
  interests: string[]
}

export interface User {
  id: string
  profile: Profile
  createdAt: number // epoch ms — used for Buddy Trio eligibility
  acceptedSafety: boolean
  onboardingComplete: boolean
  isStaff?: boolean
  // Behaviour signals used for Buddy Trio eligibility scoring.
  endedRelationshipCount: number
}

// A computed/seeded suggestion shown on the Matches page.
export interface MatchSuggestion {
  userId: string
  score: number
  highlights: string[]
}

export type ApprovalDirection = 'outgoing' | 'incoming'

// One user expressing "I'd like to connect" with another.
export interface MatchApproval {
  id: string
  fromUserId: string
  toUserId: string
  createdAt: number
  status: 'pending' | 'matched' | 'passed'
}

export interface BuddyRelationship {
  id: string
  userIds: [string, string]
  createdAt: number
  active: boolean
  endReason?: string
  levelKeys: string[] // unlocked buddy level keys
}

export type Reaction = '❤️' | '👏' | '💪' | '🎉' | '🤗'

export interface ChatMessage {
  id: string
  relationshipId: string
  senderId: string
  text: string
  createdAt: number
  reactions: Reaction[]
}

export type MilestoneType =
  | 'Started medication'
  | 'First injection completed'
  | 'First week completed'
  | 'First month completed'
  | 'Lost 5 kg'
  | 'Lost 10 kg'
  | 'Reached goal weight'
  | 'Overcame plateau'
  | 'Improved habits'
  | 'Custom milestone'

export interface Milestone {
  id: string
  relationshipId: string
  authorId: string
  type: MilestoneType
  note: string
  createdAt: number
}

export type TimelineEventType =
  | 'milestone'
  | 'comment'
  | 'reaction'
  | 'moment'
  | 'reflection'
  | 'level'

export interface TimelineEvent {
  id: string
  relationshipId: string
  type: TimelineEventType
  authorId: string
  text: string
  refId?: string // e.g. milestone id this event refers to
  reactions: Reaction[]
  createdAt: number
}

export type NotificationType =
  | 'new_match'
  | 'approved_you'
  | 'match_created'
  | 'message'
  | 'milestone'
  | 'goal_reached'
  | 'reflection'
  | 'trio_unlocked'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  createdAt: number
  read: boolean
  link?: string
}

export interface ReportBlock {
  id: string
  reporterId: string
  targetUserId: string
  kind: 'report' | 'block'
  reason: string
  createdAt: number
}

export interface BuddyTrioGroup {
  id: string
  memberIds: string[]
  pendingMemberIds: string[] // invited, not yet approved
  createdAt: number
  active: boolean
}

export interface TrioMessage {
  id: string
  trioId: string
  senderId: string
  text: string
  createdAt: number
  reactions: Reaction[]
}

export interface AppState {
  currentUserId: string | null
  users: Record<string, User>
  approvals: MatchApproval[]
  relationships: BuddyRelationship[]
  messages: ChatMessage[]
  milestones: Milestone[]
  timeline: TimelineEvent[]
  notifications: AppNotification[]
  reports: ReportBlock[]
  trios: BuddyTrioGroup[]
  trioMessages: TrioMessage[]
  passedUserIds: string[]
}
