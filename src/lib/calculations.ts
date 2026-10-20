import type { AppSettings, ConsumptionEvent, CravingEvent, DailySummaryStats, ReductionPlan, PlanPhase } from '../types';
import { getLocalDateString } from '../db';

/**
 * Calculate cost per single piece of Nicotex
 */
export function calculateCostPerPiece(packPrice: number, packQuantity: number): number {
  if (!packQuantity || packQuantity <= 0 || !packPrice || packPrice < 0) return 0;
  return Number((packPrice / packQuantity).toFixed(2));
}

/**
 * Calculate total expenditure for a given number of pieces
 */
export function calculateExpenditure(piecesCount: number, costPerPiece: number): number {
  return Number((piecesCount * costPerPiece).toFixed(2));
}

/**
 * Calculate estimated avoided expenditure compared to baseline.
 * Avoided spending = (Baseline Pieces Expected - Actual Pieces Consumed) * costPerPiece
 */
export function calculateAvoidedExpenditure(
  baselinePiecesPerDay: number,
  actualPiecesConsumed: number,
  daysTracked: number,
  costPerPiece: number
): { avoidedAmount: number; piecesSaved: number } {
  if (daysTracked <= 0) return { avoidedAmount: 0, piecesSaved: 0 };
  const expectedBaselinePieces = baselinePiecesPerDay * daysTracked;
  const piecesSaved = Math.max(0, expectedBaselinePieces - actualPiecesConsumed);
  const avoidedAmount = Number((piecesSaved * costPerPiece).toFixed(2));
  return { avoidedAmount, piecesSaved };
}

/**
 * Format elapsed time in human-friendly format
 */
export function formatElapsedTime(fromTimestamp: number, toTimestamp: number = Date.now()): {
  formatted: string;
  minutes: number;
  hours: number;
} {
  if (!fromTimestamp || fromTimestamp > toTimestamp) {
    return { formatted: 'None recorded', minutes: 0, hours: 0 };
  }
  const diffMs = Math.max(0, toTimestamp - fromTimestamp);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) {
    return { formatted: 'Just now', minutes: 0, hours: 0 };
  }
  if (hours === 0) {
    return { formatted: `${minutes}m ago`, minutes: totalMinutes, hours: 0 };
  }
  return { formatted: `${hours}h ${minutes}m ago`, minutes: totalMinutes, hours };
}

/**
 * Group consumption events by local date string (YYYY-MM-DD)
 */
export function groupConsumptionByDate(events: ConsumptionEvent[]): Map<string, ConsumptionEvent[]> {
  const map = new Map<string, ConsumptionEvent[]>();
  for (const ev of events) {
    const list = map.get(ev.localDateStr) || [];
    list.push(ev);
    map.set(ev.localDateStr, list);
  }
  return map;
}

/**
 * Calculate 7-day rolling average for a specific date
 */
export function calculateSevenDayRollingAverage(
  events: ConsumptionEvent[],
  targetDateStr: string = getLocalDateString()
): number {
  const targetDate = new Date(targetDateStr);
  const dateStrings: string[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    dateStrings.push(getLocalDateString(d));
  }

  const grouped = groupConsumptionByDate(events);
  let totalPieces = 0;

  for (const ds of dateStrings) {
    const dayEvents = grouped.get(ds) || [];
    const count = dayEvents.reduce((acc, ev) => acc + (ev.quantity || 1), 0);
    totalPieces += count;
  }

  return Number((totalPieces / 7).toFixed(1));
}

/**
 * Calculate adherence streaks.
 * Rules:
 * - A compliant day (actual <= target) extends streak.
 * - A noncompliant day (actual > target) breaks the current streak.
 * - Missing data between first logged day and today does NOT count as success.
 * - A lapse ends the streak, but history is never erased.
 */
export function calculateStreaks(
  events: ConsumptionEvent[],
  targetPerDay: number,
  firstLoggedDateStr?: string,
  todayStr: string = getLocalDateString()
): {
  currentStreak: number;
  bestStreak: number;
  daysCompliant: number;
  totalDaysEvaluated: number;
  streakHistory: { startDate: string; endDate: string; length: number }[];
} {
  if (events.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      daysCompliant: 0,
      totalDaysEvaluated: 0,
      streakHistory: []
    };
  }

  // Find start date
  const sortedDates = Array.from(new Set(events.map(e => e.localDateStr))).sort();
  const startDateStr = firstLoggedDateStr || sortedDates[0];
  const startDate = new Date(startDateStr);
  const today = new Date(todayStr);

  const grouped = groupConsumptionByDate(events);

  let currentStreak = 0;
  let bestStreak = 0;
  let daysCompliant = 0;
  let totalDaysEvaluated = 0;

  const streakHistory: { startDate: string; endDate: string; length: number }[] = [];
  let tempStreakStart: string | null = null;
  let tempStreakCount = 0;

  // Iterate day by day from startDate to today
  const curr = new Date(startDate);
  while (curr <= today) {
    const dateStr = getLocalDateString(curr);
    totalDaysEvaluated++;

    const dayEvents = grouped.get(dateStr);
    const dayPieces = dayEvents ? dayEvents.reduce((acc, e) => acc + (e.quantity || 1), 0) : 0;
    
    // Check if recorded and compliant
    // Note: If no events were logged at all on a past day, it cannot be assumed compliant
    const hasData = dayEvents !== undefined && dayEvents.length > 0;
    const isToday = dateStr === todayStr;

    const isCompliant = hasData && dayPieces <= targetPerDay;

    if (isCompliant) {
      daysCompliant++;
      tempStreakCount++;
      if (!tempStreakStart) tempStreakStart = dateStr;
      if (tempStreakCount > bestStreak) {
        bestStreak = tempStreakCount;
      }
    } else {
      // If it's today and dayPieces <= targetPerDay so far, it might be in-progress
      if (isToday && dayPieces <= targetPerDay) {
        // Still active today
      } else {
        if (tempStreakCount > 0 && tempStreakStart) {
          streakHistory.push({
            startDate: tempStreakStart,
            endDate: getLocalDateString(new Date(curr.getTime() - 86400000)),
            length: tempStreakCount
          });
        }
        tempStreakCount = 0;
        tempStreakStart = null;
      }
    }

    curr.setDate(curr.getDate() + 1);
  }

  currentStreak = tempStreakCount;

  return {
    currentStreak,
    bestStreak,
    daysCompliant,
    totalDaysEvaluated,
    streakHistory
  };
}

/**
 * Calculate average interval between pieces
 */
export function calculateAverageInterval(events: ConsumptionEvent[]): number | null {
  if (events.length < 2) return null;
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let totalIntervalMinutes = 0;
  let intervalsCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const diffMin = (sorted[i].timestamp - sorted[i - 1].timestamp) / 60000;
    // Discard overnight gaps greater than 10 hours for daily interval calculation
    if (diffMin > 10 && diffMin < 600) {
      totalIntervalMinutes += diffMin;
      intervalsCount++;
    }
  }

  if (intervalsCount === 0) return null;
  return Math.round(totalIntervalMinutes / intervalsCount);
}

/**
 * Craving analytics calculation
 */
export function calculateCravingStats(cravings: CravingEvent[]) {
  if (cravings.length === 0) {
    return {
      total: 0,
      resistedCount: 0,
      postponedCount: 0,
      consumedCount: 0,
      managedWithoutConsumptionPct: 0,
      avgInitialIntensity: 0,
      avgFinalIntensity: 0,
      commonTriggers: [] as { trigger: string; count: number }[],
      effectiveInterventions: [] as { intervention: string; count: number; successRate: number }[]
    };
  }

  const total = cravings.length;
  let resistedCount = 0;
  let postponedCount = 0;
  let consumedCount = 0;
  let sumInit = 0;
  let sumFinal = 0;
  let countWithFinal = 0;

  const triggerMap = new Map<string, number>();
  const interventionMap = new Map<string, { total: number; resistedOrPostponed: number }>();

  for (const c of cravings) {
    sumInit += c.initialIntensity || 0;
    if (c.finalIntensity !== undefined) {
      sumFinal += c.finalIntensity;
      countWithFinal++;
    }

    if (c.outcome === 'resisted') resistedCount++;
    else if (c.outcome === 'postponed') postponedCount++;
    else if (c.outcome === 'consumed' || c.consumedNicotex) consumedCount++;

    const tr = c.trigger || 'Other';
    triggerMap.set(tr, (triggerMap.get(tr) || 0) + 1);

    if (c.intervention) {
      const entry = interventionMap.get(c.intervention) || { total: 0, resistedOrPostponed: 0 };
      entry.total++;
      if (c.outcome === 'resisted' || c.outcome === 'postponed' || !c.consumedNicotex) {
        entry.resistedOrPostponed++;
      }
      interventionMap.set(c.intervention, entry);
    }
  }

  const managedWithoutConsumption = resistedCount + postponedCount;
  const managedWithoutConsumptionPct = Math.round((managedWithoutConsumption / total) * 100);
  const avgInitialIntensity = Number((sumInit / total).toFixed(1));
  const avgFinalIntensity = countWithFinal > 0 ? Number((sumFinal / countWithFinal).toFixed(1)) : avgInitialIntensity;

  const commonTriggers = Array.from(triggerMap.entries())
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count);

  const effectiveInterventions = Array.from(interventionMap.entries())
    .map(([intervention, stat]) => ({
      intervention,
      count: stat.total,
      successRate: Math.round((stat.resistedOrPostponed / stat.total) * 100)
    }))
    .sort((a, b) => b.successRate - a.successRate);

  return {
    total,
    resistedCount,
    postponedCount,
    consumedCount,
    managedWithoutConsumptionPct,
    avgInitialIntensity,
    avgFinalIntensity,
    commonTriggers,
    effectiveInterventions
  };
}

/**
 * Local pattern detection and behavioral insights based exclusively on actual data.
 * Does not make up claims and requires minimum data points.
 */
export function detectPatterns(
  consumption: ConsumptionEvent[],
  cravings: CravingEvent[]
): {
  hasSufficientData: boolean;
  insights: { title: string; detail: string; category: 'timing' | 'trigger' | 'craving' | 'spending' }[];
  hourlyDistribution: number[]; // 24 hours
} {
  const hourly = new Array(24).fill(0);
  for (const c of consumption) {
    const hour = new Date(c.timestamp).getHours();
    hourly[hour] += c.quantity || 1;
  }

  if (consumption.length < 5) {
    return {
      hasSufficientData: false,
      insights: [
        {
          title: 'Baseline monitoring in progress',
          detail: 'Keep logging your natural consumption and cravings for a few more days to reveal clear timing and trigger patterns.',
          category: 'timing'
        }
      ],
      hourlyDistribution: hourly
    };
  }

  const insights: { title: string; detail: string; category: 'timing' | 'trigger' | 'craving' | 'spending' }[] = [];

  // 1. Peak consumption time window
  let peakHour = 0;
  let maxCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourly[h] > maxCount) {
      maxCount = hourly[h];
      peakHour = h;
    }
  }

  if (maxCount >= 2) {
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 === 0 ? 12 : h % 12;
      return `${hr} ${ampm}`;
    };
    insights.push({
      title: `Peak consumption around ${formatHour(peakHour)}`,
      detail: `Your highest recorded consumption window concentrates between ${formatHour(peakHour)} and ${formatHour((peakHour + 2) % 24)}. Planning an intentional 5-minute pause or drinking water before this window can interrupt automatic consumption.`,
      category: 'timing'
    });
  }

  // 2. Unplanned trigger analysis
  const unplanned = consumption.filter(c => !c.isScheduled);
  if (unplanned.length >= 3) {
    const triggerCounts: Record<string, number> = {};
    for (const u of unplanned) {
      triggerCounts[u.trigger] = (triggerCounts[u.trigger] || 0) + 1;
    }
    const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];
    if (topTrigger) {
      insights.push({
        title: `Frequent trigger: "${topTrigger[0]}"`,
        detail: `"${topTrigger[0]}" accounts for ${topTrigger[1]} unplanned pieces. Recognising this specific context in the moment is the first step toward substituting Nicotex with a non-nicotine response.`,
        category: 'trigger'
      });
    }
  }

  // 3. Craving intervention success
  if (cravings.length >= 3) {
    const resisted = cravings.filter(c => c.outcome === 'resisted' || c.outcome === 'postponed');
    const rate = Math.round((resisted.length / cravings.length) * 100);
    insights.push({
      title: `${rate}% cravings managed without Nicotex`,
      detail: `You paused and managed ${resisted.length} out of ${cravings.length} recorded cravings using delay techniques. Each postponed piece weakens the neurobiological association between cravings and immediate gum use.`,
      category: 'craving'
    });
  }

  return {
    hasSufficientData: true,
    insights,
    hourlyDistribution: hourly
  };
}

/**
 * Generate a personalized reduction plan based on user baseline and preferences.
 * Does not make medical claims; provides safe, gradual phasing.
 */
export function generateReductionPlan(settings: AppSettings): ReductionPlan {
  const planId = `plan_${Date.now()}`;
  const baseline = Math.max(2, settings.baselinePiecesPerDay || 8);
  const strength = settings.strength;
  const is4mg = strength === '4mg';

  const phases: PlanPhase[] = [];

  // Phase 1: Baseline Monitoring (5-7 days)
  phases.push({
    id: `${planId}_p0`,
    planId,
    phaseIndex: 0,
    name: 'Phase 0: Baseline Observation',
    startDate: getLocalDateString(),
    targetPiecesPerDay: baseline,
    plannedWindows: generatePlannedWindows(settings.wakeTime, settings.sleepTime, baseline),
    durationDays: settings.baselineObservationDays || 5,
    reviewCriteria: 'Log every piece and craving consistently without pressure to drastically reduce yet.',
    rationale: 'Understand true triggers, automatic routines, and peak craving hours before changing intake.',
    status: 'active'
  });

  // Phase 2: Spacing & Eliminating Automatic Pieces (e.g. cut 1-2 pieces)
  const p1Target = Math.max(1, baseline - (baseline > 10 ? 2 : 1));
  phases.push({
    id: `${planId}_p1`,
    planId,
    phaseIndex: 1,
    name: 'Phase 1: Mindful Spacing & Cutting 1st Automatic Piece',
    startDate: '',
    targetPiecesPerDay: p1Target,
    plannedWindows: generatePlannedWindows(settings.wakeTime, settings.sleepTime, p1Target),
    durationDays: 14,
    reviewCriteria: 'Delay the first piece after waking by at least 30-45 minutes and eliminate 1 routine piece.',
    rationale: 'Disrupting morning and automatic post-meal cues has the highest impact on reducing chemical dependence.',
    status: 'upcoming'
  });

  // Phase 3: Gradual Step Down (target approx 60-70% of baseline)
  const p2Target = Math.max(1, Math.round(baseline * 0.65));
  phases.push({
    id: `${planId}_p2`,
    planId,
    phaseIndex: 2,
    name: is4mg ? 'Phase 2: Step Down / Alternate with 2mg' : 'Phase 2: Gradual Step Down',
    startDate: '',
    targetPiecesPerDay: p2Target,
    plannedWindows: generatePlannedWindows(settings.wakeTime, settings.sleepTime, p2Target),
    durationDays: 14,
    reviewCriteria: is4mg
      ? 'Introduce 2mg pieces or regular sugar-free gum in place of afternoon 4mg doses.'
      : 'Maintain consistent 2 to 3 hour gaps between pieces.',
    rationale: 'Stepping down physical nicotine intake while keeping oral fixation satisfied with chewing.',
    status: 'upcoming'
  });

  // Phase 4: Low Frequency Maintenance (2-3 pieces/day)
  const p3Target = Math.max(1, Math.min(3, Math.round(baseline * 0.35)));
  phases.push({
    id: `${planId}_p3`,
    planId,
    phaseIndex: 3,
    name: 'Phase 3: Low Frequency & Craving-Only Protocol',
    startDate: '',
    targetPiecesPerDay: p3Target,
    plannedWindows: generatePlannedWindows(settings.wakeTime, settings.sleepTime, p3Target),
    durationDays: 14,
    reviewCriteria: 'Use Nicotex strictly during acute unmanageable cravings rather than habit.',
    rationale: 'Shifting from scheduled dependence to rare emergency intervention.',
    status: 'upcoming'
  });

  // Phase 5: Complete Freedom (0 pieces)
  phases.push({
    id: `${planId}_p4`,
    planId,
    phaseIndex: 4,
    name: 'Phase 4: Complete Freedom & Maintenance',
    startDate: '',
    targetPiecesPerDay: 0,
    plannedWindows: [],
    durationDays: 21,
    reviewCriteria: 'Zero daily Nicotex. Rely completely on water, deep breathing, and non-nicotine mints/gum.',
    rationale: 'Full independence from nicotine dependence with relapse-resistant coping skills.',
    status: 'upcoming'
  });

  return {
    id: planId,
    title: `Personal Nicotex ${strength} Reduction Plan`,
    createdAt: Date.now(),
    baselineDailyPieces: baseline,
    strength,
    currentPhaseIndex: 0,
    status: 'baseline_monitoring',
    phases,
    reviewHistory: [
      {
        timestamp: Date.now(),
        notes: `Initial personalized plan created based on baseline of ${baseline} pieces/day.`,
        action: 'Created plan'
      }
    ]
  };
}

/**
 * Generate sensible scheduled windows between wake time and sleep time
 */
export function generatePlannedWindows(wakeTime: string, sleepTime: string, pieces: number): string[] {
  if (pieces <= 0) return [];
  const parseMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 8) * 60 + (m || 0);
  };
  const wakeM = parseMinutes(wakeTime || '07:30');
  let sleepM = parseMinutes(sleepTime || '23:30');
  if (sleepM <= wakeM) sleepM += 1440; // overnight wrap

  // Leave buffer after wake (30 mins) and before bed (60 mins)
  const startM = wakeM + 30;
  const endM = sleepM - 60;
  const usable = Math.max(120, endM - startM);
  const step = Math.floor(usable / (pieces + 1));

  const windows: string[] = [];
  for (let i = 1; i <= pieces; i++) {
    const rawM = (startM + step * i) % 1440;
    const h = String(Math.floor(rawM / 60)).padStart(2, '0');
    const m = String(rawM % 60).padStart(2, '0');
    windows.push(`${h}:${m}`);
  }
  return windows;
}
