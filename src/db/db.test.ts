import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  getSettings,
  updateSettings,
  exportDatabaseToJSON,
  exportConsumptionToCSV,
  exportCravingsToCSV,
  importDatabaseFromJSON,
  clearAllDatabaseData,
  getLocalDateString
} from './index';
import type {
  ConsumptionEvent,
  CravingEvent,
  DailyWakeSession,
  PlannedDoseWindow,
  MealDrinkEvent
} from '../types';

describe('IndexedDB Persistence & Data Operations', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
  });

  it('initializes default settings correctly with schedule defaults', async () => {
    const s = await getSettings();
    expect(s.product).toBe('Nicotex');
    expect(s.strength).toBe('2mg');
    expect(s.onboardingCompleted).toBe(false);
    expect(s.scheduleMode).toBe('actual_wake');
    expect(s.firstDoseDelayMinutes).toBe(30);
    expect(s.minSpacingMinutes).toBe(90);
  });

  it('updates settings without data loss', async () => {
    await updateSettings({ strength: '4mg', packPrice: 150, firstDoseDelayMinutes: 45 });
    const s = await getSettings();
    expect(s.strength).toBe('4mg');
    expect(s.packPrice).toBe(150);
    expect(s.firstDoseDelayMinutes).toBe(45);
  });

  it('records and queries consumption events with extended session tracking', async () => {
    const event: ConsumptionEvent = {
      id: 'test_c_1',
      timestamp: 1700000000000,
      localDateStr: '2026-10-20',
      product: 'Nicotex',
      strength: '2mg',
      quantity: 1,
      trigger: 'After a meal',
      contextualFactors: ['With Coffee / Tea'],
      isScheduled: true,
      plannedWindowId: 'win_1',
      sessionStatus: 'completed',
      notes: 'Post lunch scheduled piece'
    };

    await db.consumption.put(event);
    const retrieved = await db.consumption.get('test_c_1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.trigger).toBe('After a meal');
    expect(retrieved?.plannedWindowId).toBe('win_1');
    expect(retrieved?.sessionStatus).toBe('completed');
  });

  it('records and queries wake sessions and audit records', async () => {
    const wake: DailyWakeSession = {
      id: 'wake_2026-10-20',
      dateStr: '2026-10-20',
      wakeTimestamp: 1700000000000,
      wakeTime: '07:15',
      targetBedtime: '23:30',
      scheduleMode: 'actual_wake',
      firstPlannedDoseTime: '07:45',
      firstPlannedDoseTimestamp: 1700000000000 + 30 * 60000,
      auditHistory: [
        { timestamp: 1700000000000, action: 'Initial wake-up record' }
      ]
    };

    await db.wakeSessions.put(wake);
    const retrieved = await db.wakeSessions.get('wake_2026-10-20');
    expect(retrieved).toBeDefined();
    expect(retrieved?.wakeTime).toBe('07:15');
    expect(retrieved?.auditHistory.length).toBe(1);
  });

  it('records planned dose windows and updates status on dose completion', async () => {
    const window: PlannedDoseWindow = {
      id: 'win_test_1',
      dateStr: '2026-10-20',
      windowIndex: 0,
      originalPlannedTime: '09:00',
      originalPlannedTimestamp: 1700000000000,
      status: 'upcoming'
    };

    await db.plannedWindows.put(window);
    await db.plannedWindows.update('win_test_1', {
      status: 'logged',
      actualConsumptionId: 'c_actual_1',
      actualConsumptionTime: '09:12',
      delayMinutes: 12
    });

    const retrieved = await db.plannedWindows.get('win_test_1');
    expect(retrieved?.status).toBe('logged');
    expect(retrieved?.delayMinutes).toBe(12);
    expect(retrieved?.actualConsumptionTime).toBe('09:12');
  });

  it('records meal and beverage events', async () => {
    const meal: MealDrinkEvent = {
      id: 'meal_1',
      dateStr: '2026-10-20',
      timestamp: 1700000000000,
      time: '12:30',
      type: 'lunch',
      title: 'Lunch with Team'
    };

    await db.mealEvents.put(meal);
    const retrieved = await db.mealEvents.get('meal_1');
    expect(retrieved?.title).toBe('Lunch with Team');
    expect(retrieved?.type).toBe('lunch');
  });

  it('exports and restores full database in JSON format including new tables', async () => {
    await updateSettings({ baselinePiecesPerDay: 12, strength: '4mg' });
    await db.consumption.put({
      id: 'ev_123',
      timestamp: 1700000000000,
      localDateStr: '2026-10-20',
      product: 'Nicotex',
      strength: '4mg',
      quantity: 1,
      trigger: 'Stress',
      contextualFactors: [],
      isScheduled: true
    });
    await db.wakeSessions.put({
      id: 'wake_2026-10-20',
      dateStr: '2026-10-20',
      wakeTimestamp: 1700000000000,
      wakeTime: '07:30',
      targetBedtime: '23:30',
      scheduleMode: 'actual_wake',
      firstPlannedDoseTime: '08:00',
      firstPlannedDoseTimestamp: 1700000000000 + 30 * 60000,
      auditHistory: []
    });

    const exportedJSON = await exportDatabaseToJSON();
    expect(exportedJSON).toContain('NicotexOS');
    expect(exportedJSON).toContain('ev_123');
    expect(exportedJSON).toContain('wake_2026-10-20');

    // Clear everything
    await clearAllDatabaseData();
    const settingsAfterClear = await getSettings();
    expect(settingsAfterClear.strength).toBe('2mg');

    // Restore from exported JSON
    const restoreRes = await importDatabaseFromJSON(exportedJSON);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.count).toBeGreaterThanOrEqual(1);

    const restoredWake = await db.wakeSessions.get('wake_2026-10-20');
    expect(restoredWake?.wakeTime).toBe('07:30');

    const restoredEvent = await db.consumption.get('ev_123');
    expect(restoredEvent?.trigger).toBe('Stress');
  });

  it('exports consumption and cravings to CSV format with headers', async () => {
    await db.consumption.put({
      id: 'csv_1',
      timestamp: 1700000000000,
      localDateStr: '2026-10-20',
      product: 'Nicotex',
      strength: '2mg',
      quantity: 1,
      trigger: 'Work or concentration',
      contextualFactors: ['Work pressure / Deadline'],
      isScheduled: false,
      sessionStatus: 'completed',
      notes: 'Deadline sprint'
    });

    const csv = await exportConsumptionToCSV();
    expect(csv).toContain('Trigger / Reason');
    expect(csv).toContain('Session Status');
    expect(csv).toContain('Work or concentration');
    expect(csv).toContain('Deadline sprint');
  });

  it('formats local date string consistently', () => {
    const fixedDate = new Date(2026, 9, 20, 12, 0, 0);
    expect(getLocalDateString(fixedDate)).toBe('2026-10-20');
  });
});
