import React, { useState, useEffect } from 'react';
import { Plus, Check, Clock, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import {
  CONSUMPTION_REASONS,
  CONTEXTUAL_FACTORS,
  type ConsumptionReason,
  type ContextualFactor,
  type NicotexStrength,
  type ConsumptionEvent,
  type PlannedDoseWindow,
  type SessionStatus
} from '../types';
import { db, getLocalDateString } from '../db';

interface LogNicotexModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStrength?: NicotexStrength;
  existingEvent?: ConsumptionEvent | null;
  targetWindow?: PlannedDoseWindow | null;
  isScheduledDefault?: boolean;
  onSaved?: () => void;
}

export const LogNicotexModal: React.FC<LogNicotexModalProps> = ({
  isOpen,
  onClose,
  defaultStrength = '2mg',
  existingEvent = null,
  targetWindow = null,
  isScheduledDefault = false,
  onSaved
}) => {
  const [strength, setStrength] = useState<NicotexStrength>(defaultStrength);
  const [quantity, setQuantity] = useState<number>(1);
  const [isScheduled, setIsScheduled] = useState<boolean>(isScheduledDefault);
  const [trigger, setTrigger] = useState<ConsumptionReason | string>(
    isScheduledDefault ? CONSUMPTION_REASONS[0] : CONSUMPTION_REASONS[1]
  );
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [contextualFactors, setContextualFactors] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('completed');
  const [interruptionReason, setInterruptionReason] = useState<string>('');
  const [cravingIntensity, setCravingIntensity] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (existingEvent) {
      setStrength(existingEvent.strength);
      setQuantity(existingEvent.quantity || 1);
      if (CONSUMPTION_REASONS.includes(existingEvent.trigger as ConsumptionReason)) {
        setTrigger(existingEvent.trigger);
        setCustomTrigger('');
      } else {
        setTrigger('Other');
        setCustomTrigger(existingEvent.trigger);
      }
      setContextualFactors(existingEvent.contextualFactors || []);
      setIsScheduled(existingEvent.isScheduled);
      setSessionStatus(existingEvent.sessionStatus || 'completed');
      setInterruptionReason(existingEvent.interruptionReason || '');
      setCravingIntensity(existingEvent.cravingIntensity ?? 5);
      setNotes(existingEvent.notes || '');
      const d = new Date(existingEvent.startTime || existingEvent.timestamp);
      setCustomTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setStrength(defaultStrength);
      setQuantity(1);
      const scheduledMode = targetWindow ? true : isScheduledDefault;
      setIsScheduled(scheduledMode);
      setTrigger(scheduledMode ? CONSUMPTION_REASONS[0] : CONSUMPTION_REASONS[1]);
      setCustomTrigger('');
      setContextualFactors([]);
      setSessionStatus('completed');
      setInterruptionReason('');
      setCravingIntensity(5);
      setNotes('');
      const d = new Date();
      setCustomTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  }, [isOpen, existingEvent, defaultStrength, targetWindow, isScheduledDefault]);

  const toggleFactor = (f: ContextualFactor) => {
    setContextualFactors(prev =>
      prev.includes(f) ? prev.filter(item => item !== f) : [...prev, f]
    );
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      let eventTimestamp = existingEvent ? existingEvent.timestamp : now.getTime();

      if (customTime) {
        const [h, m] = customTime.split(':').map(Number);
        const adjustedDate = new Date(eventTimestamp);
        adjustedDate.setHours(h || 0, m || 0, 0, 0);
        eventTimestamp = adjustedDate.getTime();
      }

      const finalTrigger = trigger === 'Other' && customTrigger.trim() ? customTrigger.trim() : trigger;
      const todayStr = getLocalDateString(new Date(eventTimestamp));

      const recordId = existingEvent ? existingEvent.id : `cons_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const record: ConsumptionEvent = {
        id: recordId,
        timestamp: eventTimestamp,
        localDateStr: todayStr,
        product: 'Nicotex',
        strength,
        quantity: Math.max(1, quantity),
        trigger: finalTrigger,
        contextualFactors,
        isScheduled,
        isUnplanned: !isScheduled,
        sessionStatus,
        interruptionReason: sessionStatus === 'interrupted' ? interruptionReason.trim() : undefined,
        cravingIntensity: !isScheduled ? cravingIntensity : undefined,
        startTime: eventTimestamp,
        stopTime: sessionStatus === 'completed' ? eventTimestamp + 30 * 60000 : undefined,
        notes: notes.trim() || undefined,
        cravingEventId: existingEvent?.cravingEventId,
        plannedWindowId: targetWindow ? targetWindow.id : existingEvent?.plannedWindowId
      };

      await db.transaction('rw', [db.consumption, db.plannedWindows], async () => {
        await db.consumption.put(record);

        // If linked to a planned window, update the window's status
        if (targetWindow) {
          const delayMinutes = Math.floor((eventTimestamp - targetWindow.originalPlannedTimestamp) / 60000);
          await db.plannedWindows.update(targetWindow.id, {
            status: 'logged',
            actualConsumptionId: recordId,
            actualConsumptionTimestamp: eventTimestamp,
            actualConsumptionTime: customTime,
            delayMinutes: Math.max(0, delayMinutes)
          });
        }
      });

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to log Nicotex piece', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEvent) return;
    if (confirm('Delete this recorded piece?')) {
      await db.transaction('rw', [db.consumption, db.plannedWindows], async () => {
        await db.consumption.delete(existingEvent.id);
        if (existingEvent.plannedWindowId) {
          await db.plannedWindows.update(existingEvent.plannedWindowId, {
            status: 'upcoming',
            actualConsumptionId: undefined,
            actualConsumptionTime: undefined,
            actualConsumptionTimestamp: undefined,
            delayMinutes: undefined
          });
        }
      });
      onSaved?.();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingEvent ? 'Edit Logged Piece' : isScheduled ? 'Log Scheduled Dose' : 'Log Unplanned Dose'}
    >
      <div className="space-y-4">
        {/* Scheduled vs Unplanned Mode Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setIsScheduled(true);
              setTrigger(CONSUMPTION_REASONS[0]);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              isScheduled
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scheduled Dose
          </button>
          <button
            type="button"
            onClick={() => {
              setIsScheduled(false);
              setTrigger(CONSUMPTION_REASONS[1]);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              !isScheduled
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unplanned Piece
          </button>
        </div>

        {targetWindow && (
          <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-center justify-between">
            <span>Linked to Window #{targetWindow.windowIndex + 1} ({targetWindow.originalPlannedTime})</span>
            <span className="text-[10px] text-cyan-400 font-bold uppercase">Scheduled</span>
          </div>
        )}

        {/* Strength & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Strength</label>
            <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700/80">
              {(['2mg', '4mg'] as NicotexStrength[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrength(s)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    strength === s
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Start Time</label>
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Session Status: Completed normally vs Stopped Early vs Active */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Session Status:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'completed' as SessionStatus, label: 'Completed (~30m)' },
              { id: 'interrupted' as SessionStatus, label: 'Stopped Early' },
              { id: 'active' as SessionStatus, label: 'Chewing Now' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSessionStatus(item.id)}
                className={`py-2 px-1 text-center text-[11px] rounded-xl border transition-all leading-tight ${
                  sessionStatus === item.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {sessionStatus === 'interrupted' && (
            <div className="mt-2.5 p-3 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-2">
              <label className="text-[11px] font-semibold text-amber-300 block">
                Why was the session stopped early?
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch ready, hot coffee, phone call..."
                value={interruptionReason}
                onChange={e => setInterruptionReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
              <p className="text-[10px] text-slate-400 italic">
                * Note: This piece still counts toward today's total. Do not take an extra piece or double up to compensate.
              </p>
            </div>
          )}
        </div>

        {/* Reason / Trigger selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Reason / Cue:
          </label>
          <select
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
          >
            {CONSUMPTION_REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {trigger === 'Other' && (
            <input
              type="text"
              placeholder="Specify custom trigger..."
              value={customTrigger}
              onChange={e => setCustomTrigger(e.target.value)}
              className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          )}
        </div>

        {/* Craving Intensity (if unplanned) */}
        {!isScheduled && (
          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Craving Intensity:</span>
              <span className="text-amber-400 font-bold">{cravingIntensity}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={cravingIntensity}
              onChange={e => setCravingIntensity(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Contextual Factors (Multi-select) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Contextual Factors:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTUAL_FACTORS.map(factor => {
              const selected = contextualFactors.includes(factor);
              return (
                <button
                  key={factor}
                  type="button"
                  onClick={() => toggleFactor(factor)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    selected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-medium'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {factor}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Notes</label>
          <input
            type="text"
            placeholder="Optional reflections..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {existingEvent ? (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}

          <Button
            type="button"
            variant={isScheduled ? 'primary' : 'glow'}
            size="md"
            fullWidth
            disabled={isSubmitting}
            onClick={handleSave}
          >
            {isSubmitting ? 'Saving...' : existingEvent ? 'Save Changes' : isScheduled ? 'Confirm Scheduled Dose' : 'Log Unplanned Piece'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
