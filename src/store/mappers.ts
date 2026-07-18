// Convert Supabase row shapes into the in-app domain types the UI/selectors use.
import type {
  ApprovalRow,
  CheckinRow,
  GoalRow,
  InjectionLogRow,
  MealRow,
  MessageRow,
  MilestoneRow,
  NotificationRow,
  ProfileRow,
  RelationshipRow,
  TimelineEventRow,
  TrioMessageRow,
  SymptomLogRow,
  WeightLogRow,
} from '../lib/database.types'
import type {
  AppNotification,
  BuddyRelationship,
  ChatMessage,
  GenderPreference,
  Goal,
  InjectionLog,
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
  Checkin,
  CheckinStatus,
  Meal,
  SymptomLog,
  WeightLog,
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
    injectionWeekday: r.injection_weekday ?? undefined,
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
    isPremium: r.is_premium,
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
    replyTo: r.reply_to ?? undefined,
    fromCoach: r.from_coach ?? false,
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
    imageUrl: r.image_url ?? undefined,
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

export function rowToCheckin(r: CheckinRow): Checkin {
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status as CheckinStatus,
    note: r.note ?? undefined,
    createdAt: ms(r.created_at),
  }
}

export function rowToMeal(r: MealRow): Meal {
  return {
    id: r.id,
    userId: r.user_id,
    imageUrl: r.image_url ?? undefined,
    title: r.title,
    calories: r.calories,
    proteinG: r.protein_g,
    carbsG: Number(r.carbs_g ?? 0),
    fatG: Number(r.fat_g ?? 0),
    fiberG: Number(r.fiber_g ?? 0),
    items: Array.isArray(r.items)
      ? r.items.map((it) => ({
          name: String(it?.name ?? 'Item'),
          grams: Number(it?.grams ?? 0),
          calories: Number(it?.calories ?? 0),
          proteinG: Number(it?.protein_g ?? 0),
          carbsG: Number(it?.carbs_g ?? 0),
          fatG: Number(it?.fat_g ?? 0),
        }))
      : [],
    note: r.note ?? undefined,
    createdAt: ms(r.created_at),
  }
}

export function rowToWeightLog(r: WeightLogRow): WeightLog {
  return {
    id: r.id,
    userId: r.user_id,
    kg: Number(r.kg),
    loggedAt: ms(r.logged_at),
  }
}

export function rowToInjectionLog(r: InjectionLogRow): InjectionLog {
  return {
    id: r.id,
    userId: r.user_id,
    medication: r.medication,
    dose: r.dose_text ?? undefined,
    injectionSite: r.injection_site ?? undefined,
    note: r.note ?? undefined,
    injectedAt: ms(r.injected_at),
    createdAt: ms(r.created_at),
  }
}

export function rowToSymptomLog(r: SymptomLogRow): SymptomLog {
  return {
    id: r.id,
    userId: r.user_id,
    symptom: r.symptom,
    severity: Math.min(5, Math.max(1, Number(r.severity))) as SymptomLog['severity'],
    note: r.note ?? undefined,
    loggedAt: ms(r.logged_at),
    createdAt: ms(r.created_at),
  }
}

export function rowToGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    relationshipId: r.relationship_id,
    title: r.title,
    targetCount: r.target_count,
    progressCount: r.progress_count,
    createdBy: r.created_by,
    createdAt: ms(r.created_at),
    completedAt: r.completed_at ? ms(r.completed_at) : undefined,
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
