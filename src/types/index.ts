export type NicotexStrength = '2mg' | '4mg';

export type StoppingTimeline = '4weeks' | '8weeks' | '12weeks' | 'flexible' | 'baseline_only';

export type ScheduleMode = 'actual_wake' | 'fixed_clock';

export type SessionStatus = 'active' | 'completed' | 'interrupted';

export type WindowStatus = 'upcoming' | 'due' | 'overdue' | 'logged' | 'missed' | 'rescheduled';

export type MealDrinkType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'coffee' | 'tea' | 'other_drink' | 'custom';

export type RetailerSource =
  | 'Blinkit'
  | 'Swiggy Instamart'
  | 'BigBasket'
  | 'Local Pharmacy'
  | 'Other Shop'
  | 'Other Online';

export type ProductFormat = 'packet' | 'tin' | 'other';

export const CONSUMPTION_REASONS = [
  'Recommended by my reduction schedule',
  'Craving or physical withdrawal',
  'Stress or anxiety',
  'Boredom',
  'Work or concentration',
  'After a meal',
  'Coffee or tea',
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

export const PURCHASE_TRIGGERS = [
  'I was stressed',
  'I was running out',
  'I bought it out of habit',
  'I wanted to stockpile',
  'Offer or discount notification',
  'Difficult work day',
  'Social trigger',
  'Other reason'
] as const;

export type PurchaseTrigger = typeof PURCHASE_TRIGGERS[number];

export const INTERVENTION_TYPES = [
  { id: 'breathing', label: 'Slow Breathing (4-7-8)', icon: 'Wind', desc: '4s inhale, 7s hold, 8s slow exhale' },
  { id: 'water', label: 'Drink Water', icon: 'Droplets', desc: 'Sip a full cool glass of water slowly' },
  { id: 'walk', label: 'Short Walk / Stretch', icon: 'Footprints', desc: 'Step outside or stretch your muscles' },
  { id: 'activity', label: 'Change Activity (5-4-3-2-1)', icon: 'Shuffle', desc: 'Disengage focus and reset your surroundings' },
  { id: 'surfing', label: 'Urge Surfing', icon: 'Waves', desc: 'Observe physical sensations without judging them' },
  { id: 'custom', label: 'Configured Strategy', icon: 'Compass', desc: 'Your personal calming or distraction technique' }
] as const;

export interface FinancialMotivation {
  id: string;
  category: 'emi' | 'travel' | 'investment' | 'relationships' | 'health' | 'other';
  title: string;
  targetAmount?: number;
  enabled: boolean;
  order?: number;
}

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

  // Wake-up and dose scheduling settings
  scheduleMode: ScheduleMode; // 'actual_wake' | 'fixed_clock'
  firstDoseDelayMinutes: number; // e.g. 30, 45, 60
  minSpacingMinutes: number; // minimum spacing between doses, e.g. 90
  usualMeals?: { type: MealDrinkType; time: string; title: string }[];

  // Purchase & Financial motivation settings
  openingStockPieces: number;
  historicalMonthlySpendingEstimate?: number;
  financialMotivations: FinancialMotivation[];
  monthlyNicotexBudgetLimit?: number;
  repeatPurchaseWindowHours: number; // default 24
}

export interface PurchaseRecord {
  id: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  retailer: RetailerSource | string;
  format: ProductFormat;
  strength: NicotexStrength;
  packsCount: number;
  piecesPerPack: number;
  pricePerPack: number;
  deliveryCharge: number;
  discount: number;
  otherCharges: number;
  totalPaid: number;
  costPerPiece: number; // totalPaid / (packsCount * piecesPerPack)
  receiptRef?: string;
  notes?: string;

  // Pattern detection fields
  isRepeatPurchase?: boolean;
  repeatHoursSinceLast?: number;
  repeatWithPurchaseId?: string;
  purchaseTrigger?: PurchaseTrigger | string;
  acknowledgedRepeat?: boolean;

  auditHistory?: {
    timestamp: number;
    action: string;
    prevTotal?: number;
    newTotal?: number;
    reason?: string;
  }[];
}

export interface PurchaseUrgeEvent {
  id: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  trigger: string;
  pauseDurationMinutes: number;
  pauseDurationSeconds?: number;
  alternativeTried?: string;
  outcome: 'resisted' | 'delayed' | 'purchased' | 'still_want_to_buy';
  estimatedCostAvoided?: number;
  purchasedRecordId?: string;
  notes?: string;
}

export interface InventoryAdjustment {
  id: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  piecesAdjusted: number; // positive or negative
  reason: 'lost' | 'discarded' | 'shared' | 'stock_audit' | 'other';
  notes?: string;
}

export interface ConsumptionEvent {
  id: string;
  timestamp: number; // epoch ms
  localDateStr: string; // YYYY-MM-DD
  product: string;
  strength: NicotexStrength;
  quantity: number;
  trigger: ConsumptionReason | string;
  contextualFactors: string[];
  isScheduled: boolean;
  notes?: string;
  cravingEventId?: string;

  // Extended session tracking
  plannedWindowId?: string;
  startTime?: number;
  stopTime?: number;
  sessionStatus?: SessionStatus;
  interruptionReason?: string;
  cravingIntensity?: number;
  isUnplanned?: boolean;
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

export interface DailyWakeSession {
  id: string;
  dateStr: string;
  wakeTimestamp: number;
  wakeTime: string;
  targetBedtime: string;
  scheduleMode: ScheduleMode;
  firstPlannedDoseTime: string;
  firstPlannedDoseTimestamp: number;
  auditHistory: {
    timestamp: number;
    action: string;
    prevTime?: string;
    newTime?: string;
    reason?: string;
  }[];
}

export interface PlannedDoseWindow {
  id: string;
  dateStr: string;
  windowIndex: number;
  originalPlannedTime: string;
  originalPlannedTimestamp: number;
  status: WindowStatus;
  actualConsumptionId?: string;
  actualConsumptionTime?: string;
  actualConsumptionTimestamp?: number;
  delayMinutes?: number;
  notes?: string;
}

export interface MealDrinkEvent {
  id: string;
  dateStr: string;
  timestamp: number;
  time: string;
  type: MealDrinkType;
  title: string;
  notes?: string;
}

export interface PlanPhase {
  id: string;
  planId: string;
  phaseIndex: number;
  name: string;
  startDate: string;
  targetPiecesPerDay: number;
  plannedWindows: string[];
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
  date: string;
  count: number;
  target: number;
  isCompliant: boolean;
  cost: number;
  cravingsCount: number;
  cravingsResisted: number;
  firstConsumptionTime?: number;
  lastConsumptionTime?: number;
  unplannedCount: number;
  interruptedCount: number;
}
