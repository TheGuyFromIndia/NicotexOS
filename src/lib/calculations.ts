import type {
  AppSettings,
  ConsumptionEvent,
  CravingEvent,
  DailySummaryStats,
  ReductionPlan,
  PlanPhase,
  DailyWakeSession,
  PlannedDoseWindow,
  MealDrinkEvent,
  ScheduleMode
} from '../types';
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
 * Format countdown remaining time (ms) to human-friendly format (e.g. "42m", "1h 15m", "0m")
 */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'Due now';
  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
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
 * Local pattern detection based strictly on recorded events.
 */
export function detectPatterns(
  consumption: ConsumptionEvent[],
  cravings: CravingEvent[]
): {
  hasSufficientData: boolean;
  insights: { title: string; detail: string; category: 'timing' | 'trigger' | 'craving' | 'spending' }[];
  hourlyDistribution: number[];
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
 */
export function generateReductionPlan(settings: AppSettings): ReductionPlan {
  const planId = `plan_${Date.now()}`;
  const baseline = Math.max(2, settings.baselinePiecesPerDay || 8);
  const strength = settings.strength;
  const is4mg = strength === '4mg';

  const phases: PlanPhase[] = [];

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
  if (sleepM <= wakeM) sleepM += 1440;

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

// ==========================================
// NEW WORKFLOW & PERSISTENT DOSE TIMERS
// ==========================================

/**
 * Calculate first planned dose timestamp and formatted time based on wake timestamp and delay
 */
export function calculateFirstDoseTime(wakeTimestamp: number, delayMinutes: number = 30): {
  firstDoseTimestamp: number;
  firstDoseTimeStr: string;
} {
  const firstDoseTimestamp = wakeTimestamp + delayMinutes * 60 * 1000;
  const d = new Date(firstDoseTimestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return {
    firstDoseTimestamp,
    firstDoseTimeStr: `${h}:${m}`
  };
}

/**
 * Generate today's planned dose windows based on actual wake-up or fixed schedule
 */
export function generateDayWindows(
  wakeTimestamp: number,
  targetPieces: number,
  targetBedtimeStr: string = '23:30',
  scheduleMode: ScheduleMode = 'actual_wake',
  delayMinutes: number = 30,
  dateStr: string = getLocalDateString(new Date(wakeTimestamp))
): PlannedDoseWindow[] {
  if (targetPieces <= 0) return [];

  const wakeDate = new Date(wakeTimestamp);
  let startTimestamp: number;

  if (scheduleMode === 'actual_wake') {
    startTimestamp = wakeTimestamp + delayMinutes * 60 * 1000;
  } else {
    // Fixed clock time mode: Use default wake hour on the same calendar day
    const fixedWakeDate = new Date(wakeDate);
    const [wh, wm] = (targetBedtimeStr ? '07:30' : '07:30').split(':').map(Number);
    fixedWakeDate.setHours(wh, wm, 0, 0);
    startTimestamp = fixedWakeDate.getTime() + delayMinutes * 60 * 1000;
  }

  // Bedtime timestamp calculation
  const [bh, bm] = targetBedtimeStr.split(':').map(Number);
  const bedDate = new Date(wakeDate);
  bedDate.setHours(bh, bm, 0, 0);
  if (bedDate.getTime() <= startTimestamp) {
    // Bedtime rolls over into next morning
    bedDate.setDate(bedDate.getDate() + 1);
  }

  const endTimestamp = bedDate.getTime() - 60 * 60 * 1000; // 1 hr before bed
  const usableDurationMs = Math.max(120 * 60 * 1000, endTimestamp - startTimestamp);
  const stepMs = targetPieces > 1 ? Math.floor(usableDurationMs / (targetPieces - 1)) : 0;

  const windows: PlannedDoseWindow[] = [];

  for (let i = 0; i < targetPieces; i++) {
    const plannedTimestamp = targetPieces === 1 ? startTimestamp : startTimestamp + i * stepMs;
    const pd = new Date(plannedTimestamp);
    const timeStr = `${String(pd.getHours()).padStart(2, '0')}:${String(pd.getMinutes()).padStart(2, '0')}`;

    windows.push({
      id: `window_${dateStr}_${i}`,
      dateStr,
      windowIndex: i,
      originalPlannedTime: timeStr,
      originalPlannedTimestamp: plannedTimestamp,
      status: 'upcoming'
    });
  }

  return windows;
}

/**
 * Calculate comprehensive persistent dose timers
 */
export function calculateDoseTimers(
  plannedWindows: PlannedDoseWindow[],
  consumptionEvents: ConsumptionEvent[],
  now: number = Date.now()
): {
  timeUntilNextPlannedMs: number | null;
  timeUntilNextFormatted: string;
  nextPlannedWindow: PlannedDoseWindow | null;
  timeSinceLastActualMs: number | null;
  timeSinceLastActualFormatted: string;
  lastActualConsumption: ConsumptionEvent | null;
  overdueWindow: PlannedDoseWindow | null;
  overdueMinutes: number;
  timeSinceLastScheduledMs: number | null;
  timeSinceLastScheduledFormatted: string;
  lastScheduledWindow: PlannedDoseWindow | null;
  activeSession: ConsumptionEvent | null;
  interruptedTodayCount: number;
  unplannedTodayCount: number;
} {
  // 1. Last actual consumption
  const sortedActual = [...consumptionEvents].sort((a, b) => b.timestamp - a.timestamp);
  const lastActual = sortedActual[0] || null;
  const timeSinceLastActualMs = lastActual ? Math.max(0, now - (lastActual.startTime || lastActual.timestamp)) : null;
  const timeSinceLastActualFormatted = lastActual
    ? formatElapsedTime(lastActual.startTime || lastActual.timestamp, now).formatted
    : 'None recorded today';

  // 2. Active chewing session
  const activeSession = sortedActual.find(c => c.sessionStatus === 'active') || null;

  // 3. Planned windows analysis
  const sortedWindows = [...plannedWindows].sort((a, b) => a.originalPlannedTimestamp - b.originalPlannedTimestamp);

  // Find next upcoming/due window that hasn't been logged yet
  let nextPlannedWindow: PlannedDoseWindow | null = null;
  let overdueWindow: PlannedDoseWindow | null = null;
  let overdueMinutes = 0;
  let lastScheduledWindow: PlannedDoseWindow | null = null;

  for (const win of sortedWindows) {
    if (win.status === 'logged') {
      lastScheduledWindow = win;
      continue;
    }

    const diff = win.originalPlannedTimestamp - now;
    if (diff > 0) {
      if (!nextPlannedWindow) {
        nextPlannedWindow = win;
      }
    } else {
      // Overdue: planned time has passed and not logged
      if (!overdueWindow) {
        overdueWindow = win;
        overdueMinutes = Math.floor(Math.abs(diff) / 60000);
      }
      lastScheduledWindow = win;
    }
  }

  // Time until next planned dose
  const timeUntilNextPlannedMs = nextPlannedWindow ? nextPlannedWindow.originalPlannedTimestamp - now : null;
  const timeUntilNextFormatted = timeUntilNextPlannedMs !== null ? formatCountdown(timeUntilNextPlannedMs) : 'None remaining';

  // Time since last scheduled window
  const timeSinceLastScheduledMs = lastScheduledWindow ? Math.max(0, now - lastScheduledWindow.originalPlannedTimestamp) : null;
  const timeSinceLastScheduledFormatted = lastScheduledWindow
    ? formatElapsedTime(lastScheduledWindow.originalPlannedTimestamp, now).formatted
    : 'None scheduled yet';

  // Counts today
  const interruptedTodayCount = consumptionEvents.filter(c => c.sessionStatus === 'interrupted').length;
  const unplannedTodayCount = consumptionEvents.filter(c => !c.isScheduled).length;

  return {
    timeUntilNextPlannedMs,
    timeUntilNextFormatted,
    nextPlannedWindow,
    timeSinceLastActualMs,
    timeSinceLastActualFormatted,
    lastActualConsumption: lastActual,
    overdueWindow,
    overdueMinutes,
    timeSinceLastScheduledMs,
    timeSinceLastScheduledFormatted,
    lastScheduledWindow,
    activeSession,
    interruptedTodayCount,
    unplannedTodayCount
  };
}

/**
 * Check spacing constraints: If an unplanned piece was taken recently,
 * does it violate the minimum spacing guideline before the next planned window?
 */
export function checkSpacingConstraint(
  lastActualTimestamp: number | null,
  nextWindowTimestamp: number | null,
  minSpacingMinutes: number = 90
): {
  hasConflict: boolean;
  gapMinutes: number | null;
  message: string | null;
} {
  if (!lastActualTimestamp || !nextWindowTimestamp) {
    return { hasConflict: false, gapMinutes: null, message: null };
  }

  const gapMs = nextWindowTimestamp - lastActualTimestamp;
  const gapMinutes = Math.floor(gapMs / 60000);

  if (gapMinutes >= 0 && gapMinutes < minSpacingMinutes) {
    return {
      hasConflict: true,
      gapMinutes,
      message: `You consumed a piece ${Math.abs(Math.floor((Date.now() - lastActualTimestamp) / 60000))}m ago. The next planned window is in ${gapMinutes}m, which is less than your ${minSpacingMinutes}m spacing guideline. Consider reviewing your schedule.`
    };
  }

  return { hasConflict: false, gapMinutes, message: null };
}

/**
 * Check food & beverage conflicts (Nicotex product leaflet guidelines):
 * - Do not eat or drink while gum is in mouth.
 * - Avoid food and drinks for 15 minutes before chewing.
 * - Acidic beverages (coffee, sodas, juice) reduce buccal nicotine absorption.
 */
export function checkFoodDrinkConflict(
  plannedWindows: PlannedDoseWindow[],
  mealEvents: MealDrinkEvent[],
  activeSession: ConsumptionEvent | null,
  now: number = Date.now()
): {
  hasConflict: boolean;
  warningMessage: string | null;
  conflictingMeal: MealDrinkEvent | null;
} {
  // If active chewing session
  if (activeSession) {
    // Check if any meal is happening right now
    const currentMeal = mealEvents.find(m => Math.abs(now - m.timestamp) < 30 * 60 * 1000);
    if (currentMeal) {
      return {
        hasConflict: true,
        warningMessage: `Active chewing session overlaps with ${currentMeal.title}. Product leaflet instructs not to eat or drink while Nicotex gum is in the mouth.`,
        conflictingMeal: currentMeal
      };
    }
  }

  // Check upcoming planned windows within 30 minutes
  for (const win of plannedWindows) {
    if (win.status === 'logged') continue;
    const winDiff = win.originalPlannedTimestamp - now;
    if (winDiff > 0 && winDiff <= 30 * 60 * 1000) {
      // Look for meals/drinks within 15 minutes before this planned dose
      const mealNear = mealEvents.find(m => {
        const diff = win.originalPlannedTimestamp - m.timestamp;
        return diff >= 0 && diff <= 15 * 60 * 1000;
      });

      if (mealNear) {
        const isAcidic = mealNear.type === 'coffee' || mealNear.type === 'tea' || mealNear.title.toLowerCase().includes('coffee') || mealNear.title.toLowerCase().includes('soda');
        const reason = isAcidic
          ? 'Acidic drinks like coffee or soda can reduce nicotine absorption through the mouth lining.'
          : 'Nicotex instructions advise avoiding food and drinks for 15 minutes before using the gum.';
        return {
          hasConflict: true,
          warningMessage: `Upcoming dose at ${win.originalPlannedTime} overlaps with ${mealNear.title} (${mealNear.time}). ${reason}`,
          conflictingMeal: mealNear
        };
      }
    }
  }

  return { hasConflict: false, warningMessage: null, conflictingMeal: null };
}

export type TimelineItemType = 
  | 'wake'
  | 'planned_window'
  | 'unplanned_dose'
  | 'meal_drink'
  | 'craving_resisted'
  | 'interruption';

export interface TimelineItem {
  id: string;
  timestamp: number;
  timeStr: string;
  type: TimelineItemType;
  title: string;
  subtitle?: string;
  statusBadge?: { label: string; variant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo' };
  notes?: string;
  rawEvent?: any;
}

/**
 * Build unified chronological day timeline from morning wake to bedtime
 */
export function buildDailyTimeline(
  wakeSession: DailyWakeSession | null,
  plannedWindows: PlannedDoseWindow[],
  consumptionEvents: ConsumptionEvent[],
  mealEvents: MealDrinkEvent[],
  cravings: CravingEvent[],
  _dateStr: string = getLocalDateString()
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // 1. Wake event
  if (wakeSession) {
    items.push({
      id: wakeSession.id,
      timestamp: wakeSession.wakeTimestamp,
      timeStr: wakeSession.wakeTime,
      type: 'wake',
      title: 'Woke Up',
      subtitle: `Target Bedtime: ${wakeSession.targetBedtime} • Mode: ${wakeSession.scheduleMode === 'actual_wake' ? 'Actual Wake' : 'Fixed Clock'}`,
      statusBadge: { label: 'Start of Day', variant: 'cyan' }
    });
  }

  // 2. Planned Windows & Linked Consumption
  for (const win of plannedWindows) {
    let badgeLabel = 'Upcoming';
    let badgeVariant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' = 'slate';

    if (win.status === 'logged') {
      badgeLabel = win.delayMinutes && win.delayMinutes > 15 ? `Late (+${win.delayMinutes}m)` : 'Taken on Schedule';
      badgeVariant = 'emerald';
    } else if (win.status === 'overdue') {
      badgeLabel = 'Overdue';
      badgeVariant = 'amber';
    } else if (win.status === 'missed') {
      badgeLabel = 'Window Missed';
      badgeVariant = 'rose';
    }

    items.push({
      id: win.id,
      timestamp: win.originalPlannedTimestamp,
      timeStr: win.originalPlannedTime,
      type: 'planned_window',
      title: `Planned Dose #${win.windowIndex + 1}`,
      subtitle: win.status === 'logged' && win.actualConsumptionTime
        ? `Chewed at ${win.actualConsumptionTime}`
        : `Scheduled window`,
      statusBadge: { label: badgeLabel, variant: badgeVariant },
      notes: win.notes,
      rawEvent: win
    });
  }

  // 3. Unplanned consumption pieces (or pieces without a planned window link)
  for (const c of consumptionEvents) {
    if (!c.isScheduled || !c.plannedWindowId) {
      items.push({
        id: c.id,
        timestamp: c.startTime || c.timestamp,
        timeStr: new Date(c.startTime || c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'unplanned_dose',
        title: `Unplanned Piece (${c.strength})`,
        subtitle: `Trigger: ${c.trigger}${c.sessionStatus === 'interrupted' ? ' • Stopped Early' : ''}`,
        statusBadge: { label: c.sessionStatus === 'interrupted' ? 'Interrupted' : 'Unplanned', variant: 'amber' },
        notes: c.notes,
        rawEvent: c
      });
    }
  }

  // 4. Meals & Drinks
  for (const m of mealEvents) {
    const isBeverage = m.type === 'coffee' || m.type === 'tea' || m.type === 'other_drink';
    items.push({
      id: m.id,
      timestamp: m.timestamp,
      timeStr: m.time,
      type: 'meal_drink',
      title: m.title,
      subtitle: isBeverage ? 'Beverage (allow 15m before gum)' : 'Meal / Food (no gum while eating)',
      statusBadge: { label: m.type.toUpperCase(), variant: 'indigo' },
      notes: m.notes,
      rawEvent: m
    });
  }

  // 5. Cravings Resisted / Postponed
  for (const cr of cravings) {
    if (cr.outcome === 'resisted' || cr.outcome === 'postponed') {
      items.push({
        id: cr.id,
        timestamp: cr.timestamp,
        timeStr: new Date(cr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'craving_resisted',
        title: 'Craving Managed',
        subtitle: `Trigger: ${cr.trigger} (Intensity ${cr.initialIntensity} → ${cr.finalIntensity ?? '?'})`,
        statusBadge: { label: cr.outcome === 'resisted' ? 'Resisted' : 'Postponed', variant: 'emerald' },
        notes: cr.notes,
        rawEvent: cr
      });
    }
  }

  return items.sort((a, b) => a.timestamp - b.timestamp);
}
