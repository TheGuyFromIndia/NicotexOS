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
import type { ConsumptionEvent, CravingEvent } from '../types';

describe('IndexedDB Persistence & Data Operations', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
  });

  it('initializes default settings correctly', async () => {
    const s = await getSettings();
    expect(s.product).toBe('Nicotex');
    expect(s.strength).toBe('2mg');
    expect(s.onboardingCompleted).toBe(false);
  });

  it('updates settings without data loss', async () => {
    await updateSettings({ strength: '4mg', packPrice: 150 });
    const s = await getSettings();
    expect(s.strength).toBe('4mg');
    expect(s.packPrice).toBe(150);
  });

  it('records and queries consumption events', async () => {
    const event: ConsumptionEvent = {
      id: 'test_c_1',
      timestamp: 1700000000000,
      localDateStr: '2026-10-20',
      product: 'Nicotex',
      strength: '2mg',
      quantity: 1,
      trigger: 'After a meal',
      contextualFactors: ['With Coffee / Tea'],
      isScheduled: false,
      notes: 'Post lunch craving'
    };

    await db.consumption.put(event);
    const retrieved = await db.consumption.get('test_c_1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.trigger).toBe('After a meal');
    expect(retrieved?.quantity).toBe(1);
  });

  it('records and queries craving interception events', async () => {
    const craving: CravingEvent = {
      id: 'test_cr_1',
      timestamp: 1700000000000,
      localDateStr: '2026-10-20',
      trigger: 'Stress',
      initialIntensity: 8,
      finalIntensity: 2,
      intervention: 'Slow Breathing (4-7-8)',
      outcome: 'resisted',
      consumedNicotex: false
    };

    await db.cravings.put(craving);
    const retrieved = await db.cravings.get('test_cr_1');
    expect(retrieved?.initialIntensity).toBe(8);
    expect(retrieved?.finalIntensity).toBe(2);
    expect(retrieved?.outcome).toBe('resisted');
  });

  it('exports and restores full database in JSON format', async () => {
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

    const exportedJSON = await exportDatabaseToJSON();
    expect(exportedJSON).toContain('NicotexOS');
    expect(exportedJSON).toContain('ev_123');

    // Clear everything
    await clearAllDatabaseData();
    const settingsAfterClear = await getSettings();
    expect(settingsAfterClear.strength).toBe('2mg'); // reverted to default

    // Restore from exported JSON
    const restoreRes = await importDatabaseFromJSON(exportedJSON);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.count).toBe(1);

    const restoredSettings = await getSettings();
    expect(restoredSettings.strength).toBe('4mg');
    expect(restoredSettings.baselinePiecesPerDay).toBe(12);

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
      notes: 'Deadline sprint'
    });

    const csv = await exportConsumptionToCSV();
    expect(csv).toContain('Trigger / Reason');
    expect(csv).toContain('Work or concentration');
    expect(csv).toContain('Deadline sprint');

    const cravingsCsv = await exportCravingsToCSV();
    expect(cravingsCsv).toContain('Initial Intensity');
  });

  it('formats local date string consistently', () => {
    const fixedDate = new Date(2026, 9, 20, 12, 0, 0); // Month 9 is October
    expect(getLocalDateString(fixedDate)).toBe('2026-10-20');
  });
});
