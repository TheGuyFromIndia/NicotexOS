import { describe, it, expect } from 'vitest';
import {
  calculateCostPerPiece,
  calculateExpenditure,
  calculateAvoidedExpenditure,
  formatElapsedTime,
  formatCountdown,
  calculateSevenDayRollingAverage,
  calculateStreaks,
  calculateAverageInterval,
  calculateCravingStats,
  detectPatterns,
  generatePlannedWindows,
  generateReductionPlan,
  calculateFirstDoseTime,
  generateDayWindows,
  calculateDoseTimers,
  checkSpacingConstraint,
  checkFoodDrinkConflict,
  buildDailyTimeline,
  formatINR,
  calculatePurchaseFinancials,
  detectRepeatPurchase,
  calculateInventoryStatus
} from './calculations';
import type {
  ConsumptionEvent,
  CravingEvent,
  AppSettings,
  PlannedDoseWindow,
  DailyWakeSession,
  MealDrinkEvent,
  PurchaseRecord
} from '../types';

describe('Calculations & Business Logic', () => {
  it('calculates cost per piece correctly', () => {
    expect(calculateCostPerPiece(115, 9)).toBe(12.78);
    expect(calculateCostPerPiece(20, 10)).toBe(2);
    expect(calculateCostPerPiece(100, 0)).toBe(0);
  });

  it('calculates total expenditure', () => {
    expect(calculateExpenditure(10, 12.78)).toBe(127.8);
    expect(calculateExpenditure(0, 12.78)).toBe(0);
  });

  it('calculates estimated avoided expenditure against baseline', () => {
    const res = calculateAvoidedExpenditure(10, 30, 5, 12.5);
    expect(res.piecesSaved).toBe(20);
    expect(res.avoidedAmount).toBe(250);
  });

  it('formats elapsed time appropriately', () => {
    const now = 1700000000000;
    expect(formatElapsedTime(now - 10 * 60 * 1000, now).formatted).toBe('10m ago');
    expect(formatElapsedTime(now - (2 * 60 + 15) * 60 * 1000, now).formatted).toBe('2h 15m ago');
    expect(formatElapsedTime(now - 20000, now).formatted).toBe('Just now');
    expect(formatElapsedTime(0, now).formatted).toBe('None recorded');
  });

  it('formats countdown timer properly', () => {
    expect(formatCountdown(45 * 60 * 1000)).toBe('45m');
    expect(formatCountdown(90 * 60 * 1000)).toBe('1h 30m');
    expect(formatCountdown(0)).toBe('Due now');
    expect(formatCountdown(-1000)).toBe('Due now');
  });

  it('calculates 7-day rolling average correctly', () => {
    const mockEvents: ConsumptionEvent[] = [
      { id: '1', timestamp: Date.now(), localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 4, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: Date.now(), localDateStr: '2026-10-19', product: 'Nicotex', strength: '2mg', quantity: 5, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '3', timestamp: Date.now(), localDateStr: '2026-10-18', product: 'Nicotex', strength: '2mg', quantity: 5, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];
    const avg = calculateSevenDayRollingAverage(mockEvents, '2026-10-20');
    expect(avg).toBe(2.0);
  });

  it('calculates streaks and handles missing data properly without falsely rewarding gaps', () => {
    const events: ConsumptionEvent[] = [
      { id: '1', timestamp: 100, localDateStr: '2026-10-01', product: 'Nicotex', strength: '2mg', quantity: 5, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: 200, localDateStr: '2026-10-02', product: 'Nicotex', strength: '2mg', quantity: 7, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '3', timestamp: 300, localDateStr: '2026-10-03', product: 'Nicotex', strength: '2mg', quantity: 4, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];

    const result = calculateStreaks(events, 6, '2026-10-01', '2026-10-03');
    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(1);
    expect(result.daysCompliant).toBe(2);
  });

  it('does NOT count missing unrecorded days as compliant streak extensions', () => {
    const events: ConsumptionEvent[] = [
      { id: '1', timestamp: 100, localDateStr: '2026-10-01', product: 'Nicotex', strength: '2mg', quantity: 3, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: 400, localDateStr: '2026-10-04', product: 'Nicotex', strength: '2mg', quantity: 3, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];

    const res = calculateStreaks(events, 5, '2026-10-01', '2026-10-04');
    expect(res.currentStreak).toBe(1);
  });

  it('calculates average interval between consumption events', () => {
    const base = 1700000000000;
    const events: ConsumptionEvent[] = [
      { id: '1', timestamp: base, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '2', timestamp: base + 90 * 60000, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Other', contextualFactors: [], isScheduled: true },
      { id: '3', timestamp: base + 210 * 60000, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Other', contextualFactors: [], isScheduled: true },
    ];
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
    expect(stats.managedWithoutConsumptionPct).toBe(67);
    expect(stats.avgInitialIntensity).toBe(7.7);
    expect(stats.commonTriggers[0].trigger).toBe('Stress');
    expect(stats.commonTriggers[0].count).toBe(2);
  });

  it('calculates first planned dose time based on wake-up timestamp and delay', () => {
    const wakeDate = new Date(2026, 9, 20, 7, 0, 0);
    const { firstDoseTimestamp, firstDoseTimeStr } = calculateFirstDoseTime(wakeDate.getTime(), 30);
    expect(firstDoseTimeStr).toBe('07:30');
    expect(firstDoseTimestamp - wakeDate.getTime()).toBe(30 * 60 * 1000);
  });

  it('generates day dose windows starting from wake-up time', () => {
    const wakeDate = new Date(2026, 9, 20, 8, 0, 0);
    const windows = generateDayWindows(wakeDate.getTime(), 4, '22:00', 'actual_wake', 30, '2026-10-20');
    expect(windows.length).toBe(4);
    expect(windows[0].originalPlannedTime).toBe('08:30');
    expect(windows[0].status).toBe('upcoming');
  });

  it('calculates live dose timers: next countdown, time since last use, and overdue detection', () => {
    const base = new Date(2026, 9, 20, 12, 0, 0).getTime();
    const plannedWindows: PlannedDoseWindow[] = [
      { id: 'w0', dateStr: '2026-10-20', windowIndex: 0, originalPlannedTime: '10:00', originalPlannedTimestamp: base - 2 * 3600000, status: 'logged' },
      { id: 'w1', dateStr: '2026-10-20', windowIndex: 1, originalPlannedTime: '11:45', originalPlannedTimestamp: base - 15 * 60000, status: 'upcoming' },
      { id: 'w2', dateStr: '2026-10-20', windowIndex: 2, originalPlannedTime: '13:00', originalPlannedTimestamp: base + 60 * 60000, status: 'upcoming' },
    ];

    const consumptionEvents: ConsumptionEvent[] = [
      { id: 'c0', timestamp: base - 2 * 3600000, localDateStr: '2026-10-20', product: 'Nicotex', strength: '2mg', quantity: 1, trigger: 'Scheduled', contextualFactors: [], isScheduled: true, startTime: base - 2 * 3600000 }
    ];

    const result = calculateDoseTimers(plannedWindows, consumptionEvents, base);
    expect(result.timeSinceLastActualFormatted).toBe('2h 0m ago');
    expect(result.overdueWindow?.id).toBe('w1');
    expect(result.overdueMinutes).toBe(15);
    expect(result.nextPlannedWindow?.id).toBe('w2');
    expect(result.timeUntilNextFormatted).toBe('1h 0m');
  });

  it('handles unplanned consumption and flags spacing conflicts with next window', () => {
    const base = new Date(2026, 9, 20, 13, 20, 0).getTime();
    const nextWindowTimestamp = new Date(2026, 9, 20, 14, 0, 0).getTime();

    const spacingCheck = checkSpacingConstraint(base, nextWindowTimestamp, 90);
    expect(spacingCheck.hasConflict).toBe(true);
    expect(spacingCheck.gapMinutes).toBe(40);
    expect(spacingCheck.message).toContain('90m spacing guideline');
  });

  it('detects meal and coffee conflicts within 15 minutes before planned dose', () => {
    const doseTime = new Date(2026, 9, 20, 12, 0, 0).getTime();
    const coffeeTime = new Date(2026, 9, 20, 11, 50, 0).getTime();

    const windows: PlannedDoseWindow[] = [
      { id: 'w_test', dateStr: '2026-10-20', windowIndex: 0, originalPlannedTime: '12:00', originalPlannedTimestamp: doseTime, status: 'upcoming' }
    ];

    const meals: MealDrinkEvent[] = [
      { id: 'm_test', dateStr: '2026-10-20', timestamp: coffeeTime, time: '11:50', type: 'coffee', title: 'Espresso' }
    ];

    const conflict = checkFoodDrinkConflict(windows, meals, null, doseTime - 20 * 60000);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.warningMessage).toContain('Acidic drinks like coffee or soda can reduce nicotine absorption');
  });

  it('counts interrupted sessions as consumed pieces in timeline and tracking', () => {
    const event: ConsumptionEvent = {
      id: 'int_1',
      timestamp: Date.now(),
      localDateStr: '2026-10-20',
      product: 'Nicotex',
      strength: '2mg',
      quantity: 1,
      trigger: 'After a meal',
      contextualFactors: [],
      isScheduled: false,
      sessionStatus: 'interrupted',
      interruptionReason: 'Lunch ready'
    };

    const timeline = buildDailyTimeline(null, [], [event], [], []);
    expect(timeline.length).toBe(1);
    expect(timeline[0].statusBadge?.label).toBe('Interrupted');
    expect(timeline[0].subtitle).toContain('Stopped Early');
  });

  describe('Financial & Purchase Tracking Calculations', () => {
    it('formats numbers in Indian Rupees (INR) with standard commas', () => {
      expect(formatINR(0)).toBe('₹0');
      expect(formatINR(482)).toBe('₹482');
      expect(formatINR(3500)).toBe('₹3,500');
      expect(formatINR(25000)).toBe('₹25,000');
      expect(formatINR(125000)).toBe('₹1,25,000');
    });

    it('calculates purchase financials, cost per piece, and delivery fee metrics', () => {
      const now = new Date(2026, 9, 20, 15, 0, 0).getTime();
      const purchases: PurchaseRecord[] = [
        {
          id: 'p1',
          timestamp: now - 3 * 86400000, // 3 days ago
          dateStr: '2026-10-17',
          retailer: 'Blinkit',
          format: 'tin',
          strength: '2mg',
          packsCount: 1,
          piecesPerPack: 29,
          pricePerPack: 200,
          deliveryCharge: 28,
          discount: 0,
          otherCharges: 0,
          totalPaid: 228,
          costPerPiece: 7.86
        },
        {
          id: 'p2',
          timestamp: now - 3600000, // 1 hour ago (today)
          dateStr: '2026-10-20',
          retailer: 'Swiggy Instamart',
          format: 'tin',
          strength: '2mg',
          packsCount: 1,
          piecesPerPack: 29,
          pricePerPack: 215,
          deliveryCharge: 39,
          discount: 0,
          otherCharges: 0,
          totalPaid: 254,
          costPerPiece: 8.76
        }
      ];

      const financials = calculatePurchaseFinancials(purchases, 3500, now);
      expect(financials.totalSpentAllTime).toBe(482);
      expect(financials.spentToday).toBe(254);
      expect(financials.spentLast7Days).toBe(482);
      expect(financials.spentLast30Days).toBe(482);
      expect(financials.totalPiecesPurchased).toBe(58);
      expect(financials.totalDeliveryFees).toBe(67);
      expect(financials.avgCostPerPiece).toBe(8.31); // 482 / 58
      expect(financials.spendingByRetailer.length).toBe(2);
    });

    it('detects repeat purchase across midnight using elapsed hours (17h between 8 AM and 1 AM)', () => {
      // Scenario from requirements: 8:00 AM on Day 1 Blinkit, then 1:00 AM on Day 2 Swiggy Instamart
      const day1_8am = new Date(2026, 9, 20, 8, 0, 0).getTime();
      const day2_1am = new Date(2026, 9, 21, 1, 0, 0).getTime();

      const elapsedHours = (day2_1am - day1_8am) / (1000 * 60 * 60);
      expect(elapsedHours).toBe(17);

      const previousPurchases: PurchaseRecord[] = [
        {
          id: 'order_day1',
          timestamp: day1_8am,
          dateStr: '2026-10-20',
          retailer: 'Blinkit',
          format: 'tin',
          strength: '2mg',
          packsCount: 1,
          piecesPerPack: 29,
          pricePerPack: 200,
          deliveryCharge: 28,
          discount: 0,
          otherCharges: 0,
          totalPaid: 228,
          costPerPiece: 7.86
        }
      ];

      const repeatCheck = detectRepeatPurchase(day2_1am, previousPurchases, 24);
      expect(repeatCheck.isRepeat).toBe(true);
      expect(repeatCheck.hoursSinceLast).toBe(17);
      expect(repeatCheck.prevPurchase?.id).toBe('order_day1');

      // Combined total for the two orders across midnight: ₹482 for 58 pieces
      const totalAmountPaid = 228 + 254;
      const totalPieces = 29 + 29;
      expect(totalAmountPaid).toBe(482);
      expect(totalPieces).toBe(58);
    });

    it('does not flag repeat purchases if interval exceeds the configured window (e.g. 26 hours)', () => {
      const time1 = new Date(2026, 9, 20, 8, 0, 0).getTime();
      const time2 = new Date(2026, 9, 21, 10, 0, 0).getTime(); // 26 hours later

      const previousPurchases: PurchaseRecord[] = [
        {
          id: 'order_1',
          timestamp: time1,
          dateStr: '2026-10-20',
          retailer: 'Local Pharmacy',
          format: 'packet',
          strength: '2mg',
          packsCount: 1,
          piecesPerPack: 9,
          pricePerPack: 115,
          deliveryCharge: 0,
          discount: 0,
          otherCharges: 0,
          totalPaid: 115,
          costPerPiece: 12.78
        }
      ];

      const repeatCheck = detectRepeatPurchase(time2, previousPurchases, 24);
      expect(repeatCheck.isRepeat).toBe(false);
      expect(repeatCheck.hoursSinceLast).toBe(26);
    });

    it('maintains strict separation between inventory and consumption', () => {
      const purchases: PurchaseRecord[] = [
        {
          id: 'p1',
          timestamp: 1000,
          dateStr: '2026-10-20',
          retailer: 'Blinkit',
          format: 'tin',
          strength: '2mg',
          packsCount: 1,
          piecesPerPack: 29,
          pricePerPack: 200,
          deliveryCharge: 28,
          discount: 0,
          otherCharges: 0,
          totalPaid: 228,
          costPerPiece: 7.86
        }
      ];

      const consumption: ConsumptionEvent[] = [
        {
          id: 'c1',
          timestamp: 2000,
          localDateStr: '2026-10-20',
          product: 'Nicotex',
          strength: '2mg',
          quantity: 4,
          trigger: 'Habit',
          contextualFactors: [],
          isScheduled: true
        }
      ];

      // Opening stock 5 + 29 purchased - 4 consumed = 30 remaining
      const inventory = calculateInventoryStatus(purchases, consumption, 5);
      expect(inventory.openingStock).toBe(5);
      expect(inventory.totalPiecesPurchased).toBe(29);
      expect(inventory.totalPiecesConsumed).toBe(4);
      expect(inventory.estimatedRemainingStock).toBe(30);
      expect(inventory.isUncertain).toBe(false);
    });

    it('flags inventory uncertainty when pieces were consumed with zero opening stock and no purchase history', () => {
      const consumption: ConsumptionEvent[] = [
        {
          id: 'c1',
          timestamp: 2000,
          localDateStr: '2026-10-20',
          product: 'Nicotex',
          strength: '2mg',
          quantity: 3,
          trigger: 'Habit',
          contextualFactors: [],
          isScheduled: true
        }
      ];

      // No purchases and 0 opening stock
      const inventory = calculateInventoryStatus([], consumption, 0);
      expect(inventory.estimatedRemainingStock).toBe(0);
      expect(inventory.isUncertain).toBe(true);
    });
  });
});
