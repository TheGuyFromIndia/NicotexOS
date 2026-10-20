export type NicotexStrength = '2mg' | '4mg';

export type StoppingTimeline = '4weeks' | '8weeks' | '12weeks' | 'flexible' | 'baseline_only';

export const CONSUMPTION_REASONS = [
  'Recommended by my reduction schedule',
  'Craving or physical withdrawal',
  'Stress or anxiety',
  'Boredom',
  'Work or concentration',
  'After a meal',
  'Driving or travelling',
  'Habit or automatic behaviour',
  'Social situation',
  'Alcohol consumption',
  'Cannabis or another substance',
  'Other'
] as const;

export type ConsumptionReason = typeof CONSUMPTION_REASONS[number];

export const CONTEXTUAL_FACTORS = [
  'With Coffee / Tea',
  'Morning routine',
  'Late night',
  'Work pressure / Deadline',
  'After argument / Frustration',
  'Tired / Exhausted',
  'Post-workout',
  'During phone call',
  'Screen / Gaming time',
  'Solitary time'
] as const;

export type ContextualFactor = typeof CONTEXTUAL_FACTORS[number];

export const CRAVING_TRIGGERS = [
  'Stress',
  'Anxiety',
  'Boredom',
  'Work or concentration',
  'After eating',
  'Driving or travelling',
  'Physical withdrawal',
  'Habit or automatic urge',
  'Alcohol or another substance',
  'Other'
] as const;

export type CravingTrigger = typeof CRAVING_TRIGGERS[number];

export const INTERVENTION_TYPES = [
  { id: 'breathing', label: 'Slow Breathing (4-7-8)', icon: 'Wind', desc: '4s inhale, 7s hold, 8s slow exhale' },
  { id: 'water', label: 'Drink Water', icon: 'Droplets', desc: 'Sip a full cool glass of water slowly' },
  { id: 'walk', label: 'Short Walk / Stretch', icon: 'Footprints', desc: 'Step outside or stretch your muscles' },
  { id: 'activity', label: 'Change Activity (5-4-3-2-1)', icon: 'Shuffle', desc: 'Disengage focus and reset your surroundings' },
  { id: 'surfing', label: 'Urge Surfing', icon: 'Waves', desc: 'Observe physical sensations without judging them' },
  { id: 'custom', label: 'Configured Strategy', icon: 'Compass', desc: 'Your personal calming or distraction technique' }
] as const;

export interface AppSettings {
  id: number; // 1 for singleton
  product: string; // 'Nicotex'
  strength: NicotexStrength;
  packPrice: number; // e.g. 110
  packQuantity: number; // e.g. 9 or 10 or 25
  currency: string; // '₹', '$', '€', etc.
  baselinePiecesPerDay: number;
  baselineIntervalMinutes: number;
  timeAfterWakingMinutes: number;
  otherNicotineProducts: string[];
  previousAttempts: string;
  preferredTimeline: StoppingTimeline;
  wakeTime: string; // 'HH:MM'
  sleepTime: string; // 'HH:MM'
  onboardingCompleted: boolean;
  baselineObservationDays: number;
  currentPlanId?: string;
  notificationsEnabled: boolean;
  reminderTimes: string[];
  aiIntegrationEnabled: boolean;
  aiApiKey?: string;
  aiProvider?: 'openai' | 'anthropic' | 'gemini';
  lastBackupDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConsumptionEvent {
  id: string;
  timestamp: number;
  localDateStr: string; // YYYY-MM-DD
  product: string;
  strength: NicotexStrength;
  quantity: number;
  trigger: ConsumptionReason | string;
  contextualFactors: string[];
  isScheduled: boolean;
  notes?: string;
  cravingEventId?: string;
}

export interface CravingEvent {
  id: string;
  timestamp: number;
  localDateStr: string; // YYYY-MM-DD
  trigger: CravingTrigger | string;
  initialIntensity: number; // 1 - 10
  finalIntensity?: number; // 1 - 10
  intervention?: string;
  outcome?: 'resisted' | 'postponed' | 'consumed';
  consumedNicotex?: boolean;
  associatedConsumptionId?: string;
  notes?: string;
  durationSeconds?: number;
}

export interface PlanPhase {
  id: string;
  planId: string;
  phaseIndex: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  targetPiecesPerDay: number;
  plannedWindows: string[]; // ['09:00', '13:00', ...]
  durationDays: number;
  reviewCriteria: string;
  rationale: string;
  status: 'upcoming' | 'active' | 'completed' | 'paused';
}

export interface ReductionPlan {
  id: string;
  title: string;
  createdAt: number;
  baselineDailyPieces: number;
  strength: NicotexStrength;
  currentPhaseIndex: number;
  status: 'baseline_monitoring' | 'active' | 'paused' | 'completed';
  phases: PlanPhase[];
  reviewHistory: {
    timestamp: number;
    notes: string;
    action: string;
  }[];
}

export interface DailySummaryStats {
  date: string; // YYYY-MM-DD
  count: number;
  target: number;
  isCompliant: boolean;
  cost: number;
  cravingsCount: number;
  cravingsResisted: number;
  firstConsumptionTime?: number;
  lastConsumptionTime?: number;
}
