import React, { useState } from 'react';
import { Sunrise, Clock, Check, Edit2, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import type { DailyWakeSession, AppSettings, PlannedDoseWindow } from '../types';
import { db, getLocalDateString } from '../db';
import { calculateFirstDoseTime, generateDayWindows, formatCountdown } from '../lib/calculations';

interface WakeUpCardProps {
  wakeSession: DailyWakeSession | null;
  settings: AppSettings | null;
  targetPieces: number;
  onWakeSessionUpdated: () => void;
}

export const WakeUpCard: React.FC<WakeUpCardProps> = ({
  wakeSession,
  settings,
  targetPieces,
  onWakeSessionUpdated
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTimeStr, setEditTimeStr] = useState('');
  const [editReason, setEditReason] = useState('');

  const todayStr = getLocalDateString();
  const delayMinutes = settings?.firstDoseDelayMinutes ?? 30;
  const scheduleMode = settings?.scheduleMode ?? 'actual_wake';
  const bedtime = settings?.sleepTime ?? '23:30';

  const handleWakeUpNow = async () => {
    const now = Date.now();
    const d = new Date(now);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const { firstDoseTimestamp, firstDoseTimeStr } = calculateFirstDoseTime(now, delayMinutes);

    const session: DailyWakeSession = {
      id: `wake_${todayStr}`,
      dateStr: todayStr,
      wakeTimestamp: now,
      wakeTime: timeStr,
      targetBedtime: bedtime,
      scheduleMode,
      firstPlannedDoseTime: firstDoseTimeStr,
      firstPlannedDoseTimestamp: firstDoseTimestamp,
      auditHistory: [
        {
          timestamp: now,
          action: 'Initial wake-up record'
        }
      ]
    };

    // Generate day's planned windows
    const windows = generateDayWindows(
      now,
      targetPieces,
      bedtime,
      scheduleMode,
      delayMinutes,
      todayStr
    );

    await db.transaction('rw', [db.wakeSessions, db.plannedWindows], async () => {
      await db.wakeSessions.put(session);
      // Remove any unlogged windows for today before putting new ones
      const existing = await db.plannedWindows.where('dateStr').equals(todayStr).toArray();
      const unloggedIds = existing.filter(w => w.status !== 'logged').map(w => w.id);
      if (unloggedIds.length > 0) {
        await db.plannedWindows.bulkDelete(unloggedIds);
      }
      await db.plannedWindows.bulkPut(windows);
    });

    onWakeSessionUpdated();
  };

  const handleSaveCorrection = async () => {
    if (!wakeSession || !editTimeStr) return;

    const [h, m] = editTimeStr.split(':').map(Number);
    const correctedDate = new Date(wakeSession.wakeTimestamp);
    correctedDate.setHours(h, m, 0, 0);
    const correctedTimestamp = correctedDate.getTime();

    const { firstDoseTimestamp, firstDoseTimeStr } = calculateFirstDoseTime(correctedTimestamp, delayMinutes);

    const updatedSession: DailyWakeSession = {
      ...wakeSession,
      wakeTimestamp: correctedTimestamp,
      wakeTime: editTimeStr,
      firstPlannedDoseTime: firstDoseTimeStr,
      firstPlannedDoseTimestamp: firstDoseTimestamp,
      auditHistory: [
        ...wakeSession.auditHistory,
        {
          timestamp: Date.now(),
          action: 'Corrected wake-up time',
          prevTime: wakeSession.wakeTime,
          newTime: editTimeStr,
          reason: editReason.trim() || undefined
        }
      ]
    };

    // Re-generate windows from corrected wake-up time
    const windows = generateDayWindows(
      correctedTimestamp,
      targetPieces,
      bedtime,
      scheduleMode,
      delayMinutes,
      todayStr
    );

    await db.transaction('rw', [db.wakeSessions, db.plannedWindows], async () => {
      await db.wakeSessions.put(updatedSession);
      const existing = await db.plannedWindows.where('dateStr').equals(todayStr).toArray();
      const unloggedIds = existing.filter(w => w.status !== 'logged').map(w => w.id);
      if (unloggedIds.length > 0) {
        await db.plannedWindows.bulkDelete(unloggedIds);
      }
      await db.plannedWindows.bulkPut(windows);
    });

    setIsEditModalOpen(false);
    onWakeSessionUpdated();
  };

  // If not awake yet
  if (!wakeSession) {
    return (
      <Card className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-400">
            <Sunrise size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Start of Day</span>
          </div>
          <span className="text-[11px] text-slate-400">No session active</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Record when you wake up to automatically generate today's Nicotex schedule and first dose window.
        </p>

        <Button
          variant="glow"
          size="lg"
          fullWidth
          onClick={handleWakeUpNow}
          className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 text-slate-950 font-extrabold shadow-amber-500/20"
        >
          <Sunrise size={20} className="mr-2" /> I Just Woke Up
        </Button>
      </Card>
    );
  }

  // Already recorded wake session
  const now = Date.now();
  const timeUntilFirstMs = wakeSession.firstPlannedDoseTimestamp - now;

  return (
    <>
      <Card className="p-3.5 bg-slate-900/90 border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sunrise size={16} className="text-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              Woke up at <strong className="text-cyan-400 font-mono">{wakeSession.wakeTime}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setEditTimeStr(wakeSession.wakeTime);
              setEditReason('');
              setIsEditModalOpen(true);
            }}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-cyan-300 p-1 rounded-lg"
          >
            <Edit2 size={12} />
            <span>Correct</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <span>First dose planned at: <strong className="text-slate-200 font-mono">{wakeSession.firstPlannedDoseTime}</strong></span>
          {timeUntilFirstMs > 0 ? (
            <span className="text-cyan-400 font-medium">in {formatCountdown(timeUntilFirstMs)}</span>
          ) : (
            <span className="text-emerald-400 font-medium">Window reached</span>
          )}
        </div>
      </Card>

      {/* Correct Wake-up Time Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Correct Wake-Up Time"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            If you tapped "I just woke up" late or accidentally, adjust the time here. Your schedule will be recalculated while preserving the audit record.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Actual Wake-Up Time
            </label>
            <input
              type="time"
              value={editTimeStr}
              onChange={e => setEditTimeStr(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Reason for correction (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Forgot to tap earlier"
              value={editReason}
              onChange={e => setEditReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveCorrection}
            >
              Save Correction
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
