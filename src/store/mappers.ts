// Convert Supabase row shapes into the in-app domain types the UI/selectors use.
import type {
  ApprovalRow,
  MessageRow,
  MilestoneRow,
  NotificationRow,
  ProfileRow,
  RelationshipRow,
  TimelineEventRow,
  TrioMessageRow,
} from '../lib/database.types'
import type {
  AppNotification,
  BuddyRelationship,
  ChatMessage,
  GenderPreference,
  MatchApproval,
  Medication,
  Milestone,
  MilestoneType,
  Profile,
  Reaction,
  TimelineEvent,
  TimelineEventType,
  TrioMessage,
  User,
  CommunicationPreference,
  MainGoal,
  NotificationType,
  TreatmentStage,
} from '../types'

const ms = (iso: string) => Date.parse(iso)

export function rowToProfile(r: ProfileRow): Profile {
  return {
    nickname: r.nickname,
    ageRange: r.age_range ?? '',
    gender: r.gender ?? '',
    genderPreference: (r.gender_preference as GenderPreference) ?? 'No preference',
    language: r.language ?? 'English',
    country: r.country ?? '',
    medication: (r.medication as Medication) ?? 'Other',
    treatmentStage: (r.treatment_stage as TreatmentStage) ?? 'First injection',
    currentWeightRange: r.current_weight_range ?? '',
    goalWeightRange: r.goal_weight_range ?? '',
    mainGoal: (r.main_goal as MainGoal) ?? 'Weight loss',
    communicationPreference:
      (r.communication_preference as CommunicationPreference) ?? 'Few times a week',
    bio: r.bio ?? '',
    interests: r.interests ?? [],
    avatarUrl: r.avatar_url ?? undefined,
  }
}

export function rowToUser(r: ProfileRow): User {
  return {
    id: r.id,
    profile: rowToProfile(r),
    createdAt: ms(r.created_at),
    acceptedSafety: r.accepted_safety,
    onboardingComplete: r.onboarding_complete,
    isStaff: r.is_staff,
    endedRelationshipCount: r.ended_relationship_count,
  }
}

export function rowToRelationship(r: RelationshipRow): BuddyRelationship {
  return {
    id: r.id,
    userIds: [r.user_a, r.user_b],
    createdAt: ms(r.created_at),
    active: r.active,
    endReason: r.end_reason ?? undefined,
    levelKeys: r.level_keys ?? [],
  }
}

export function rowToMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    relationshipId: r.relationship_id,
    senderId: r.sender_id,
    text: r.text ?? '',
    imageUrl: r.image_url ?? undefined,
    createdAt: ms(r.created_at),
    reactions: (r.reactions ?? []) as Reaction[],
  }
}

export function rowToMilestone(r: MilestoneRow): Milestone {
  return {
    id: r.id,
    relationshipId: r.relationship_id,
    authorId: r.author_id,
    type: r.type as MilestoneType,
    note: r.note ?? '',
    createdAt: ms(r.created_at),
  }
}

export function rowToTimeline(r: TimelineEventRow): TimelineEvent {
  return {
    id: r.id,
    relationshipId: r.relationship_id,
    type: r.type as TimelineEventType,
    authorId: r.author_id,
    text: r.text,
    refId: r.ref_id ?? undefined,
    reactions: (r.reactions ?? []) as Reaction[],
    createdAt: ms(r.created_at),
  }
}

export function rowToNotification(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    type: r.type as NotificationType,
    title: r.title,
    body: r.body,
    link: r.link ?? undefined,
    read: r.read,
    createdAt: ms(r.created_at),
  }
}

export function rowToApproval(r: ApprovalRow): MatchApproval {
  return {
    id: r.id,
    fromUserId: r.from_user,
    toUserId: r.to_user,
    status: r.status,
    createdAt: ms(r.created_at),
  }
}

export function rowToTrioMessage(r: TrioMessageRow): TrioMessage {
  return {
    id: r.id,
    trioId: r.trio_id,
    senderId: r.sender_id,
    text: r.text,
    createdAt: ms(r.created_at),
    reactions: (r.reactions ?? []) as Reaction[],
  }
}
