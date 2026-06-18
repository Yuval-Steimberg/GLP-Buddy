import type {
  Medication,
  TreatmentStage,
  MainGoal,
  CommunicationPreference,
  GenderPreference,
  MilestoneType,
  Reaction,
} from './types'

export const MEDICATIONS: Medication[] = [
  'Ozempic',
  'Wegovy',
  'Mounjaro',
  'Zepbound',
  'Saxenda',
  'Other',
]

export const TREATMENT_STAGES: TreatmentStage[] = [
  'Considering GLP',
  'Not started yet',
  'First injection',
  'First month',
  '1–3 months',
  '3–6 months',
  '6+ months',
  'Maintenance',
]

export const MAIN_GOALS: MainGoal[] = [
  'Weight loss',
  'Maintenance',
  'Side effect support',
  'Motivation',
  'Emotional support',
  'Accountability',
]

export const COMMUNICATION_PREFERENCES: CommunicationPreference[] = [
  'Daily',
  'Few times a week',
  'Weekly',
  'Minimal',
]

export const GENDER_PREFERENCES: GenderPreference[] = [
  'Same gender',
  'No preference',
  'Other',
]

export const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say', 'Other']

export const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55–64', '65+']

export const WEIGHT_RANGES = [
  '50–60 kg',
  '60–70 kg',
  '70–80 kg',
  '80–90 kg',
  '90–100 kg',
  '100–110 kg',
  '110–120 kg',
  '120+ kg',
]

export const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Hebrew',
  'Portuguese',
  'Arabic',
  'Other',
]

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Israel',
  'Germany',
  'Spain',
  'France',
  'Brazil',
  'Other',
]

export const MILESTONE_TYPES: MilestoneType[] = [
  'Started medication',
  'First injection completed',
  'First week completed',
  'First month completed',
  'Lost 5 kg',
  'Lost 10 kg',
  'Reached goal weight',
  'Overcame plateau',
  'Improved habits',
  'Custom milestone',
]

export const REACTIONS: Reaction[] = ['❤️', '👏', '💪', '🎉', '🤗']

export const MILESTONE_EMOJI: Record<MilestoneType, string> = {
  'Started medication': '💊',
  'First injection completed': '💉',
  'First week completed': '📅',
  'First month completed': '🗓️',
  'Lost 5 kg': '⚖️',
  'Lost 10 kg': '🏅',
  'Reached goal weight': '🎯',
  'Overcame plateau': '⛰️',
  'Improved habits': '🌱',
  'Custom milestone': '✨',
}

// Buddy levels (relationship retention).
export interface BuddyLevel {
  key: string
  label: string
  emoji: string
  description: string
}

export const BUDDY_LEVELS: BuddyLevel[] = [
  { key: 'first_week', label: 'First week together', emoji: '🌟', description: 'You made it through your first week as buddies.' },
  { key: 'first_month', label: 'First month together', emoji: '🌙', description: 'One month of support and counting.' },
  { key: 'hundred_days', label: '100 days together', emoji: '💯', description: 'A hundred days of showing up for each other.' },
  { key: 'plateau', label: 'Supported through a plateau', emoji: '⛰️', description: 'You helped each other through a tough stretch.' },
  { key: 'goal_reached', label: 'Goal reached together', emoji: '🎯', description: 'A goal weight reached with a buddy by your side.' },
]

export const END_REASONS = [
  'This buddy is not the right fit',
  'Communication level mismatch',
  'I want to pause',
  'Other',
]

export const MAX_BUDDIES = 3
export const TRIO_MIN_ACCOUNT_AGE_DAYS = 90

// Bump when Terms/Privacy change materially; stored on acceptance so you can
// re-prompt users who accepted an older version.
export const TERMS_VERSION = '2026-06-18'
