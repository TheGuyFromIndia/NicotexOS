import Dexie, { type EntityTable } from 'dexie';
import type {
  AppSettings,
  ConsumptionEvent,
  CravingEvent,
  ReductionPlan,
  DailyWakeSession,
  PlannedDoseWindow,
  MealDrinkEvent,
  PurchaseRecord,
  PurchaseUrgeEvent,
  InventoryAdjustment
} from '../types';

export class NicotexDatabase extends Dexie {
  settings!: EntityTable<AppSettings, 'id'>;
  consumption!: EntityTable<ConsumptionEvent, 'id'>;
  cravings!: EntityTable<CravingEvent, 'id'>;
  plans!: EntityTable<ReductionPlan, 'id'>;
  wakeSessions!: EntityTable<DailyWakeSession, 'id'>;
  plannedWindows!: EntityTable<PlannedDoseWindow, 'id'>;
  mealEvents!: EntityTable<MealDrinkEvent, 'id'>;
  purchases!: EntityTable<PurchaseRecord, 'id'>;
  purchaseUrges!: EntityTable<PurchaseUrgeEvent, 'id'>;
  inventoryAdjustments!: EntityTable<InventoryAdjustment, 'id'>;

  constructor() {
    super('NicotexOS_DB');
    
    // Version 1 (Initial release)
    this.version(1).stores({
      settings: 'id',
      consumption: 'id, timestamp, localDateStr, trigger, isScheduled, cravingEventId',
      cravings: 'id, timestamp, localDateStr, trigger, outcome, consumedNicotex',
      plans: 'id, status, createdAt'
    });

    // Version 2: Added wakeSessions, plannedWindows, mealEvents, and extended session tracking
    this.version(2).stores({
      settings: 'id',
      consumption: 'id, timestamp, localDateStr, trigger, isScheduled, cravingEventId, plannedWindowId, sessionStatus',
      cravings: 'id, timestamp, localDateStr, trigger, outcome, consumedNicotex',
      plans: 'id, status, createdAt',
      wakeSessions: 'id, dateStr, wakeTimestamp',
      plannedWindows: 'id, dateStr, originalPlannedTimestamp, status, actualConsumptionId',
      mealEvents: 'id, dateStr, timestamp, type'
    });

    // Version 3: Added purchases, purchaseUrges, inventoryAdjustments
    this.version(3).stores({
      settings: 'id',
      consumption: 'id, timestamp, localDateStr, trigger, isScheduled, cravingEventId, plannedWindowId, sessionStatus',
      cravings: 'id, timestamp, localDateStr, trigger, outcome, consumedNicotex',
      plans: 'id, status, createdAt',
      wakeSessions: 'id, dateStr, wakeTimestamp',
      plannedWindows: 'id, dateStr, originalPlannedTimestamp, status, actualConsumptionId',
      mealEvents: 'id, dateStr, timestamp, type',
      purchases: 'id, timestamp, dateStr, retailer, strength, totalPaid, isRepeatPurchase',
      purchaseUrges: 'id, timestamp, dateStr, trigger, outcome',
      inventoryAdjustments: 'id, timestamp, dateStr, reason'
    });
  }
}

export const db = new NicotexDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  product: 'Nicotex',
  strength: '2mg',
  packPrice: 115,
  packQuantity: 9,
  currency: '₹',
  baselinePiecesPerDay: 8,
  baselineIntervalMinutes: 120,
  timeAfterWakingMinutes: 30,
  otherNicotineProducts: [],
  previousAttempts: 'Tried cold turkey, experienced heavy withdrawal and returned to gum.',
  preferredTimeline: '8weeks',
  wakeTime: '07:30',
  sleepTime: '23:30',
  onboardingCompleted: false,
  baselineObservationDays: 5,
  notificationsEnabled: false,
  reminderTimes: ['09:00', '14:00', '20:00'],
  aiIntegrationEnabled: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),

  // Extended schedule settings
  scheduleMode: 'actual_wake',
  firstDoseDelayMinutes: 30,
  minSpacingMinutes: 90,
  usualMeals: [
    { type: 'breakfast', time: '08:30', title: 'Breakfast' },
    { type: 'coffee', time: '10:30', title: 'Morning Coffee' },
    { type: 'lunch', time: '13:00', title: 'Lunch' },
    { type: 'tea', time: '17:00', title: 'Evening Tea' },
    { type: 'dinner', time: '20:30', title: 'Dinner' }
  ],

  // Financial Motivations & Inventory
  openingStockPieces: 0,
  historicalMonthlySpendingEstimate: 3500,
  repeatPurchaseWindowHours: 24,
  monthlyNicotexBudgetLimit: 3000,
  financialMotivations: [
    { id: 'mot_emi', category: 'emi', title: 'Staying ahead of monthly EMI commitments', targetAmount: 25000, enabled: true, order: 1 },
    { id: 'mot_travel', category: 'travel', title: 'Building a travel & vacation fund', targetAmount: 50000, enabled: true, order: 2 },
    { id: 'mot_invest', category: 'investment', title: 'Investing in long-term wealth & mutual funds', targetAmount: 15000, enabled: true, order: 3 },
    { id: 'mot_loved_ones', category: 'relationships', title: 'Being fully present for myself and loved ones', enabled: true, order: 4 },
    { id: 'mot_health', category: 'health', title: 'Freedom from chemical oral dependence & anxiety', enabled: true, order: 5 }
  ]
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1);
  if (!existing) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  // Backfill any newly added fields
  if (!existing.financialMotivations || existing.openingStockPieces === undefined) {
    const upgraded = { ...DEFAULT_SETTINGS, ...existing };
    await db.settings.put(upgraded);
    return upgraded;
  }
  return existing;
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...partial,
    updatedAt: Date.now()
  };
  await db.settings.put(updated);
  return updated;
}

/**
 * Format local date as YYYY-MM-DD
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Export full IndexedDB dataset as JSON string
 */
export async function exportDatabaseToJSON(): Promise<string> {
  const [
    settings,
    consumption,
    cravings,
    plans,
    wakeSessions,
    plannedWindows,
    mealEvents,
    purchases,
    purchaseUrges,
    inventoryAdjustments
  ] = await Promise.all([
    db.settings.toArray(),
    db.consumption.orderBy('timestamp').toArray(),
    db.cravings.orderBy('timestamp').toArray(),
    db.plans.toArray(),
    db.wakeSessions.toArray(),
    db.plannedWindows.toArray(),
    db.mealEvents.toArray(),
    db.purchases.orderBy('timestamp').toArray(),
    db.purchaseUrges.orderBy('timestamp').toArray(),
    db.inventoryAdjustments.orderBy('timestamp').toArray()
  ]);

  const payload = {
    app: 'NicotexOS',
    version: '3.0.0',
    exportTimestamp: Date.now(),
    exportDateFormatted: new Date().toISOString(),
    data: {
      settings,
      consumption,
      cravings,
      plans,
      wakeSessions,
      plannedWindows,
      mealEvents,
      purchases,
      purchaseUrges,
      inventoryAdjustments
    }
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Export records as CSV format
 */
export async function exportConsumptionToCSV(): Promise<string> {
  const items = await db.consumption.orderBy('timestamp').toArray();
  const headers = [
    'ID', 'Date', 'Time', 'Product', 'Strength', 'Quantity',
    'Trigger / Reason', 'Contextual Factors', 'Scheduled', 'Session Status',
    'Interruption Reason', 'Craving Intensity', 'Notes', 'CravingLinked'
  ];
  const rows = items.map(c => {
    const d = new Date(c.timestamp);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clean = (str: string = '') => `"${str.replace(/"/g, '""')}"`;
    return [
      c.id,
      dateStr,
      timeStr,
      c.product,
      c.strength,
      c.quantity,
      clean(c.trigger),
      clean((c.contextualFactors || []).join('; ')),
      c.isScheduled ? 'Yes' : 'No',
      c.sessionStatus || 'completed',
      clean(c.interruptionReason || ''),
      c.cravingIntensity ?? '',
      clean(c.notes || ''),
      c.cravingEventId ? 'Yes' : 'No'
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export async function exportCravingsToCSV(): Promise<string> {
  const items = await db.cravings.orderBy('timestamp').toArray();
  const headers = ['ID', 'Date', 'Time', 'Trigger', 'Initial Intensity', 'Final Intensity', 'Intervention', 'Outcome', 'Consumed Nicotex', 'Notes'];
  const rows = items.map(c => {
    const d = new Date(c.timestamp);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clean = (str: string = '') => `"${(str || '').replace(/"/g, '""')}"`;
    return [
      c.id,
      dateStr,
      timeStr,
      clean(c.trigger),
      c.initialIntensity,
      c.finalIntensity ?? '',
      clean(c.intervention || ''),
      c.outcome || '',
      c.consumedNicotex ? 'Yes' : 'No',
      clean(c.notes || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export async function exportPurchasesToCSV(): Promise<string> {
  const items = await db.purchases.orderBy('timestamp').toArray();
  const headers = [
    'ID', 'Date', 'Time', 'Retailer', 'Format', 'Strength',
    'Packs', 'PiecesPerPack', 'PricePerPack', 'DeliveryCharge',
    'Discount', 'OtherCharges', 'TotalPaid', 'CostPerPiece',
    'IsRepeatPurchase', 'RepeatHoursSinceLast', 'PurchaseTrigger', 'Notes'
  ];
  const rows = items.map(p => {
    const d = new Date(p.timestamp);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clean = (str: string = '') => `"${(str || '').replace(/"/g, '""')}"`;
    return [
      p.id,
      dateStr,
      timeStr,
      clean(p.retailer),
      p.format,
      p.strength,
      p.packsCount,
      p.piecesPerPack,
      p.pricePerPack,
      p.deliveryCharge,
      p.discount,
      p.otherCharges,
      p.totalPaid,
      p.costPerPiece,
      p.isRepeatPurchase ? 'Yes' : 'No',
      p.repeatHoursSinceLast ?? '',
      clean(p.purchaseTrigger || ''),
      clean(p.notes || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Restore database from JSON
 */
export async function importDatabaseFromJSON(jsonString: string): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      return { success: false, message: 'Invalid Nicotex backup file format.', count: 0 };
    }

    const {
      settings,
      consumption,
      cravings,
      plans,
      wakeSessions,
      plannedWindows,
      mealEvents,
      purchases,
      purchaseUrges,
      inventoryAdjustments
    } = parsed.data;

    await db.transaction('rw', [
      db.settings,
      db.consumption,
      db.cravings,
      db.plans,
      db.wakeSessions,
      db.plannedWindows,
      db.mealEvents,
      db.purchases,
      db.purchaseUrges,
      db.inventoryAdjustments
    ], async () => {
      if (Array.isArray(settings) && settings.length > 0) {
        await db.settings.clear();
        await db.settings.bulkPut(settings);
      }
      if (Array.isArray(consumption)) {
        await db.consumption.clear();
        if (consumption.length > 0) {
          await db.consumption.bulkPut(consumption);
        }
      }
      if (Array.isArray(cravings)) {
        await db.cravings.clear();
        if (cravings.length > 0) {
          await db.cravings.bulkPut(cravings);
        }
      }
      if (Array.isArray(plans)) {
        await db.plans.clear();
        if (plans.length > 0) {
          await db.plans.bulkPut(plans);
        }
      }
      if (Array.isArray(wakeSessions)) {
        await db.wakeSessions.clear();
        if (wakeSessions.length > 0) {
          await db.wakeSessions.bulkPut(wakeSessions);
        }
      }
      if (Array.isArray(plannedWindows)) {
        await db.plannedWindows.clear();
        if (plannedWindows.length > 0) {
          await db.plannedWindows.bulkPut(plannedWindows);
        }
      }
      if (Array.isArray(mealEvents)) {
        await db.mealEvents.clear();
        if (mealEvents.length > 0) {
          await db.mealEvents.bulkPut(mealEvents);
        }
      }
      if (Array.isArray(purchases)) {
        await db.purchases.clear();
        if (purchases.length > 0) {
          await db.purchases.bulkPut(purchases);
        }
      }
      if (Array.isArray(purchaseUrges)) {
        await db.purchaseUrges.clear();
        if (purchaseUrges.length > 0) {
          await db.purchaseUrges.bulkPut(purchaseUrges);
        }
      }
      if (Array.isArray(inventoryAdjustments)) {
        await db.inventoryAdjustments.clear();
        if (inventoryAdjustments.length > 0) {
          await db.inventoryAdjustments.bulkPut(inventoryAdjustments);
        }
      }
    });

    const totalEvents =
      (consumption?.length || 0) +
      (cravings?.length || 0) +
      (purchases?.length || 0) +
      (plannedWindows?.length || 0);

    return { success: true, message: `Successfully restored ${totalEvents} records!`, count: totalEvents };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to restore: ${errorMsg}`, count: 0 };
  }
}

/**
 * Reset all data to factory default
 */
export async function clearAllDatabaseData(): Promise<void> {
  await db.transaction('rw', [
    db.settings,
    db.consumption,
    db.cravings,
    db.plans,
    db.wakeSessions,
    db.plannedWindows,
    db.mealEvents,
    db.purchases,
    db.purchaseUrges,
    db.inventoryAdjustments
  ], async () => {
    await db.settings.clear();
    await db.consumption.clear();
    await db.cravings.clear();
    await db.plans.clear();
    await db.wakeSessions.clear();
    await db.plannedWindows.clear();
    await db.mealEvents.clear();
    await db.purchases.clear();
    await db.purchaseUrges.clear();
    await db.inventoryAdjustments.clear();
    await db.settings.put(DEFAULT_SETTINGS);
  });
}
