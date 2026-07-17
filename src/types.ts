// ---------------------------------------------------------------------------
// GLPenPal — core data models
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
  avatarUrl?: string // small compressed data URL, optional
  injectionWeekday?: number // 0=Sun..6=Sat, the weekly GLP-1 injection day
}

export type CheckinStatus =
  | 'great'
  | 'good'
  | 'nausea'
  | 'fatigue'
  | 'constipation'
  | 'hungry'
  | 'low'

export interface Checkin {
  id: string
  userId: string
  status: CheckinStatus
  note?: string
  createdAt: number
}

// One food item within an analyzed meal. Grams drive per-item editing: scaling
// grams scales the item's macros, and meal totals are the sum of items.
export interface MealItem {
  name: string
  grams: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

// The estimate returned by the analyze-food function (before it's saved).
export interface AnalyzedMeal {
  title: string
  calories: number
  caloriesLow?: number
  caloriesHigh?: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  items: MealItem[]
  confidence?: 'low' | 'medium' | 'high'
}

// A saved meal in the user's private food log.
export interface Meal {
  id: string
  userId: string
  imageUrl?: string // compressed JPEG data URL of the photo
  title: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  items: MealItem[]
  note?: string
  createdAt: number
}

// ---- Staff admin dashboard (all fed by is_staff-gated RPCs) ---------------
export interface AdminOverview {
  users_total: number
  users_7d: number
  users_30d: number
  onboarded: number
  premium: number
  staff: number
  pairs_active: number
  pairs_total: number
  messages_total: number
  messages_7d: number
  milestones_total: number
  checkins_7d: number
  reports_open: number
  reports_total: number
}

export interface AdminUser {
  id: string
  nickname: string
  medication: string
  treatmentStage: string
  country: string
  createdAt: number
  onboardingComplete: boolean
  isPremium: boolean
  isStaff: boolean
}

export interface AdminReport {
  id: string
  kind: string
  reason: string
  resolved: boolean
  createdAt: number
  reporterId: string
  reporterNick: string
  targetId: string
  targetNick: string
}

export interface WeightLog {
  id: string
  userId: string
  kg: number
  loggedAt: number
}

export interface JourneyCapsule {
  label: string // e.g. "July 2026"
  monthsTogether: number
  milestones: number
  messages: number
  photos: number
  biggestWin?: string
  favoriteMemory?: string
}

// One month "chapter" in the Journey Book — an auto-written story of a buddy
// pair's month, derived entirely from existing data (no new schema).
export interface JourneyChapter {
  key: string // 'YYYY-MM'
  label: string // 'July 2026'
  monthsTogether: number
  milestoneTypes: MilestoneType[]
  milestones: number
  messages: number
  photos: number
  story: string[] // the auto-written narrative lines for this month
}

// The whole Journey Book for a relationship — cover stats + monthly chapters.
export interface JourneyBook {
  meName: string
  buddyName: string
  startDate: number
  totalDays: number
  totalMonths: number
  totalMilestones: number
  totalMessages: number
  totalPhotos: number
  topMilestone?: MilestoneType // the "biggest" milestone reached across the journey
  chapters: JourneyChapter[] // oldest → newest
}

// A shareable end-of-year recap aggregated across ALL the user's buddies for a
// calendar year — the viral "Your GLP Journey 2026" card. Derived, no schema.
export interface YearReview {
  year: number
  meName: string
  journeyStart?: number // earliest relationship/milestone date overall
  daysOnJourney: number // days on the journey by the end of the reviewed year
  buddies: number // distinct buddies connected during the year
  milestones: number
  messages: number
  photos: number
  toughWeeks: number // distinct weeks with a rough side-effect check-in
  kgLost?: number // weight lost during the year, if weight was logged
  strongestMonth?: string // e.g. 'August'
  topMilestone?: MilestoneType
  milestoneTypes: MilestoneType[] // distinct milestone types reached this year
  favoriteEncouragement?: string // a received message that stood out (no name)
  hasData: boolean
}

export interface User {
  id: string
  profile: Profile
  createdAt: number // epoch ms — used for Buddy Trio eligibility
  acceptedSafety: boolean
  onboardingComplete: boolean
  isStaff?: boolean
  isPremium?: boolean // premium subscriber — unlocks Journey Book keepsake exports
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
  imageUrl?: string
  createdAt: number
  reactions: Reaction[]
  replyTo?: string // id of the message this one is replying to
  fromCoach?: boolean // AI Coach reply summoned with "Hey Coach …" (both buddies see it)
  failed?: boolean // optimistic send that didn't reach the server
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
  | 'photo'

export interface TimelineEvent {
  id: string
  relationshipId: string
  type: TimelineEventType
  authorId: string
  text: string
  imageUrl?: string // compressed data URL for photo posts
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
  | 'checkin'
  | 'support_request'

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
  checkins: Checkin[]
  meals: Meal[]
  weightLogs: WeightLog[]
  passedUserIds: string[]
}
