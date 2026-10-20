import React, { useState } from 'react';
import { Utensils, Coffee, AlertCircle, Plus, Check } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { MealDrinkType, MealDrinkEvent } from '../types';
import { db, getLocalDateString } from '../db';

interface MealPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: () => void;
}

export const MealPlannerModal: React.FC<MealPlannerModalProps> = ({
  isOpen,
  onClose,
  onMealSaved
}) => {
  const [type, setType] = useState<MealDrinkType>('lunch');
  const [title, setTitle] = useState('Lunch');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');

  const mealPresets: { type: MealDrinkType; defaultTitle: string; icon: string }[] = [
    { type: 'breakfast', defaultTitle: 'Breakfast', icon: '🍳' },
    { type: 'lunch', defaultTitle: 'Lunch', icon: '🥗' },
    { type: 'dinner', defaultTitle: 'Dinner', icon: '🍲' },
    { type: 'coffee', defaultTitle: 'Coffee', icon: '☕' },
    { type: 'tea', defaultTitle: 'Tea', icon: '🫖' },
    { type: 'snack', defaultTitle: 'Snack', icon: '🍎' },
    { type: 'other_drink', defaultTitle: 'Drink / Soda', icon: '🥤' }
  ];

  const handleSelectPreset = (p: typeof mealPresets[number]) => {
    setType(p.type);
    setTitle(p.defaultTitle);
  };

  const handleSave = async () => {
    const todayStr = getLocalDateString();
    const [h, m] = timeStr.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(h, m, 0, 0);

    const mealEvent: MealDrinkEvent = {
      id: `meal_${Date.now()}`,
      dateStr: todayStr,
      timestamp: eventDate.getTime(),
      time: timeStr,
      type,
      title: title.trim() || 'Meal',
      notes: notes.trim() || undefined
    };

    await db.mealEvents.put(mealEvent);
    onMealSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Meal, Snack or Coffee"
    >
      <div className="space-y-4">
        {/* Preset Type Chips */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Select Type:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {mealPresets.map(preset => {
              const isSelected = type === preset.type;
              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.defaultTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Title / Name
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Time
            </label>
            <input
              type="time"
              value={timeStr}
              onChange={e => setTimeStr(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>

        {/* Official Product Leaflet Guideline Banner */}
        <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-1 text-xs">
          <span className="font-bold text-indigo-300 block">Product Leaflet Guidance:</span>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            • Do not eat or drink while Nicotex is in your mouth.<br />
            • Avoid food and beverages for 15 minutes before chewing.<br />
            • Acidic drinks (coffee, juice, soda) reduce mouth lining absorption.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Lunch with team, black coffee..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
          >
            Add to Timeline
          </Button>
        </div>
      </div>
    </Modal>
  );
};
