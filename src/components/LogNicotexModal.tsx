import React, { useState, useEffect } from 'react';
import { Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import {
  CONSUMPTION_REASONS,
  CONTEXTUAL_FACTORS,
  type ConsumptionReason,
  type ContextualFactor,
  type NicotexStrength,
  type ConsumptionEvent
} from '../types';
import { db, getLocalDateString } from '../db';

interface LogNicotexModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStrength?: NicotexStrength;
  existingEvent?: ConsumptionEvent | null;
  onSaved?: () => void;
}

export const LogNicotexModal: React.FC<LogNicotexModalProps> = ({
  isOpen,
  onClose,
  defaultStrength = '2mg',
  existingEvent = null,
  onSaved
}) => {
  const [strength, setStrength] = useState<NicotexStrength>(defaultStrength);
  const [quantity, setQuantity] = useState<number>(1);
  const [trigger, setTrigger] = useState<ConsumptionReason | string>(CONSUMPTION_REASONS[7]); // Habit / automatic
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [contextualFactors, setContextualFactors] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
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
      setNotes(existingEvent.notes || '');
      const d = new Date(existingEvent.timestamp);
      setCustomTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setStrength(defaultStrength);
      setQuantity(1);
      setTrigger(CONSUMPTION_REASONS[7]);
      setCustomTrigger('');
      setContextualFactors([]);
      setIsScheduled(false);
      setNotes('');
      const d = new Date();
      setCustomTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  }, [isOpen, existingEvent, defaultStrength]);

  const toggleFactor = (f: ContextualFactor) => {
    setContextualFactors(prev =>
      prev.includes(f) ? prev.filter(item => item !== f) : [...prev, f]
    );
  };

  const handleSave = async () => {
    if (isSubmitting) return; // Prevent duplicate taps
    setIsSubmitting(true);

    try {
      const now = new Date();
      let eventTimestamp = existingEvent ? existingEvent.timestamp : now.getTime();

      // Adjust timestamp if time input was changed
      if (customTime) {
        const [h, m] = customTime.split(':').map(Number);
        const adjustedDate = new Date(eventTimestamp);
        adjustedDate.setHours(h || 0, m || 0, 0, 0);
        eventTimestamp = adjustedDate.getTime();
      }

      const finalTrigger = trigger === 'Other' && customTrigger.trim() ? customTrigger.trim() : trigger;

      const record: ConsumptionEvent = {
        id: existingEvent ? existingEvent.id : `cons_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: eventTimestamp,
        localDateStr: getLocalDateString(new Date(eventTimestamp)),
        product: 'Nicotex',
        strength,
        quantity: Math.max(1, quantity),
        trigger: finalTrigger,
        contextualFactors,
        isScheduled,
        notes: notes.trim() || undefined,
        cravingEventId: existingEvent?.cravingEventId
      };

      await db.consumption.put(record);
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
      await db.consumption.delete(existingEvent.id);
      onSaved?.();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingEvent ? 'Edit Logged Piece' : 'Log Nicotex Piece'}
    >
      <div className="space-y-5">
        {/* Strength & Quantity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Strength</label>
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
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Quantity</label>
            <div className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-1 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95"
              >
                -
              </button>
              <span className="text-sm font-bold text-slate-100">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Time & Scheduled status */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Time Logged</label>
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="pt-5">
            <button
              type="button"
              onClick={() => setIsScheduled(!isScheduled)}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                isScheduled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
              }`}
            >
              {isScheduled && <Check size={14} />}
              <span>{isScheduled ? 'Scheduled Window' : 'Unplanned Piece'}</span>
            </button>
          </div>
        </div>

        {/* Reason / Trigger selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            What triggered this piece?
          </label>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
            {CONSUMPTION_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setTrigger(r)}
                className={`py-2 px-2.5 rounded-xl text-left text-xs transition-all border leading-snug truncate ${
                  trigger === r
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

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

        {/* Contextual Factors (Multi-select) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Contextual Factors (optional)
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

        {/* Optional Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Notes</label>
          <input
            type="text"
            placeholder="Quick note about how you felt or setting..."
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
            variant="primary"
            size="md"
            fullWidth
            disabled={isSubmitting}
            onClick={handleSave}
          >
            {isSubmitting ? 'Saving...' : existingEvent ? 'Save Changes' : 'Confirm Piece'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
