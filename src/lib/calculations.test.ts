import { describe, it, expect } from 'vitest';
import {
  calculateCostPerPiece,
  calculateExpenditure,
  calculateAvoidedExpenditure,
  formatElapsedTime,
  calculateSevenDayRollingAverage,
  calculateStreaks,
  calculateAverageInterval,
  calculateCravingStats,
  detectPatterns,
  generatePlannedWindows,
  generateReductionPlan
} from './calculations';
import type { ConsumptionEvent, CravingEvent, AppSettings } from '../types';

describe('Calculations & Business Logic', () => {
  it('calculates cost per piece correctly', () => {
    // 9 pieces for ₹115 => 115 / 9 = 12.78
    expect(calculateCostPerPiece(115, 9)).toBe(12.78);
    // 10 pieces for $20 => 2.00
    expect(calculateCostPerPiece(20, 10)).toBe(2);
    // handles 0 quantity gracefully
    expect(calculateCostPerPiece(100, 0)).toBe(0);
  });

  it('calculates total expenditure', () => {
    expect(calculateExpenditure(10, 12.78)).toBe(127.8);
    expect(calculateExpenditure(0, 12.78)).toBe(0);
  });

  it('calculates estimated avoided expenditure against baseline', () => {
    // Baseline 10 pieces/day. Over 5 days, expected = 50. Actual = 30. Saved = 20 pieces.
    const res = calculateAvoidedExpenditure(10, 30, 5, 12.5);
    expect(res.piecesSaved).toBe(20);
    expect(res.avoidedAmount).toBe(250);
  });

  it('formats elapsed time appropriately', () => {
    const now = 1700000000000;
    // 10 minutes ago
    expect(formatElapsedTime(now - 10 * 60 * 1000, now).formatted).toBe('10m ago');
    // 2 hours 15 mins ago
    expect(formatElapsedTime(now - (2 * 60 + 15) * 60 * 1000, now).formatted).toBe('2h 15m ago');
    // just now
    expect(formatElapsedTime(now - 20000, now).formatted).toBe('Just now');
    // none recorded
    expect(formatElapsedTime(0, now).formatted).toBe('None recorded');
  });

  it('calculates 7-day rolling average correctly', () => {
    const mockEvents: ConsumptionEvent[] = [
      { id: '1', timestamp: Date.now(), localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 4, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: Date.now(), localDateStr: '2026-10-19', product: 'Nicotex', strength: '2mg', quantity: 5, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '3', timestamp: Date.now(), localDateStr: '2026-10-18', product: 'Nicotex', strength: '2mg', quantity: 5, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];
    // Total 14 pieces across 7-day window => 14 / 7 = 2.0
    const avg = calculateSevenDayRollingAverage(mockEvents, '2026-10-20');
    expect(avg).toBe(2.0);
  });

  it('calculates streaks and handles missing data properly without falsely rewarding gaps', () => {
    // 3 days recorded. Day 1: 5 (target 6) - compliant. Day 2: 7 (target 6) - noncompliant. Day 3: 4 - compliant.
    const events: ConsumptionEvent[] = [
      { id: '1', timestamp: 100, localDateStr: '2026-10-01', product: 'Nicotex', strength: '2mg', quantity: 5, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: 200, localDateStr: '2026-10-02', product: 'Nicotex', strength: '2mg', quantity: 7, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '3', timestamp: 300, localDateStr: '2026-10-03', product: 'Nicotex', strength: '2mg', quantity: 4, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];

    const result = calculateStreaks(events, 6, '2026-10-01', '2026-10-03');
    // Day 1 was compliant (streak 1). Day 2 broke it. Day 3 is compliant (streak 1).
    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(1);
    expect(result.daysCompliant).toBe(2);
  });

  it('does NOT count missing unrecorded days as compliant streak extensions', () => {
    // User logged on Oct 1 compliant. No data on Oct 2, Oct 3. Logged on Oct 4.
    const events: ConsumptionEvent[] = [
      { id: '1', timestamp: 100, localDateStr: '2026-10-01', product: 'Nicotex', strength: '2mg', quantity: 3, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: 400, localDateStr: '2026-10-04', product: 'Nicotex', strength: '2mg', quantity: 3, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];

    const res = calculateStreaks(events, 5, '2026-10-01', '2026-10-04');
    // Missing days broke the streak from Oct 1. Oct 4 starts a new streak of 1.
    expect(res.currentStreak).toBe(1);
  });

  it('calculates average interval between consumption events', () => {
    const base = 1700000000000;
    const events: ConsumptionEvent[] = [
      { id: '1', timestamp: base, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: base + 90 * 60000, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '3', timestamp: base + 210 * 60000, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];
    // Intervals: 90m and 120m => avg = 105m
    const avg = calculateAverageInterval(events);
    expect(avg).toBe(105);
  });

  it('calculates craving statistics accurately', () => {
    const cravings: CravingEvent[] = [
      { id: '1', timestamp: 1, localDateStr: '2026-10-20', trigger: 'Stress', initialIntensity: 8, finalIntensity: 3, outcome: 'resisted', intervention: 'Slow Breathing (4-7-8)' },
      { id: '2', timestamp: 2, localDateStr: '2026-10-20', trigger: 'Boredom', initialIntensity: 6, finalIntensity: 2, outcome: 'postponed', intervention: 'Drink Water' },
      { id: '3', timestamp: 3, localDateStr: '2026-10-20', trigger: 'Stress', initialIntensity: 9, finalIntensity: 8, outcome: 'consumed', consumedNicotex: true, intervention: 'Walk' },
    ];

    const stats = calculateCravingStats(cravings);
    expect(stats.total).toBe(3);
    expect(stats.resistedCount).toBe(1);
    expect(stats.postponedCount).toBe(1);
    expect(stats.consumedCount).toBe(1);
    // 2 out of 3 resisted/postponed => 67%
    expect(stats.managedWithoutConsumptionPct).toBe(67);
    expect(stats.avgInitialIntensity).toBe(7.7);
    expect(stats.commonTriggers[0].trigger).toBe('Stress');
    expect(stats.commonTriggers[0].count).toBe(2);
  });

  it('detects patterns only when sufficient data exists', () => {
    const sparseEvents: ConsumptionEvent[] = [
      { id: '1', timestamp: Date.now(), localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Stress', contextualFactors: [], isScheduled: false },
    ];
    const res = detectPatterns(sparseEvents, []);
    expect(res.hasSufficientData).toBe(false);
  });

  it('generates personalized reduction plan phases', () => {
    const settings: AppSettings = {
      id: 1,
      product: 'Nicotex',
      strength: '4mg',
      packPrice: 115,
      packQuantity: 9,
      currency: '₹',
      baselinePiecesPerDay: 10,
      baselineIntervalMinutes: 90,
      timeAfterWakingMinutes: 15,
      otherNicotineProducts: [],
      previousAttempts: '',
      preferredTimeline: '8weeks',
      wakeTime: '07:00',
      sleepTime: '23:00',
      onboardingCompleted: true,
      baselineObservationDays: 5,
      notificationsEnabled: false,
      reminderTimes: [],
      aiIntegrationEnabled: false,
      createdAt: 0,
      updatedAt: 0
    };

    const plan = generateReductionPlan(settings);
    expect(plan.phases.length).toBeGreaterThanOrEqual(4);
    expect(plan.phases[0].targetPiecesPerDay).toBe(10);
    expect(plan.phases[1].targetPiecesPerDay).toBeLessThan(10);
  });

  it('generates planned consumption windows spread evenly across waking hours', () => {
    const windows = generatePlannedWindows('08:00', '22:00', 4);
    expect(windows.length).toBe(4);
    expect(windows[0]).toBeDefined();
  });
});
