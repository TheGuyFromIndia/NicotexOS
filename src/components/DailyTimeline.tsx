import React from 'react';
import {
  Sunrise,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Utensils,
  Coffee,
  ShieldCheck,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type {
  DailyWakeSession,
  PlannedDoseWindow,
  ConsumptionEvent,
  MealDrinkEvent,
  CravingEvent
} from '../types';
import { buildDailyTimeline, type TimelineItem } from '../lib/calculations';

interface DailyTimelineProps {
  wakeSession: DailyWakeSession | null;
  plannedWindows: PlannedDoseWindow[];
  consumptionEvents: ConsumptionEvent[];
  mealEvents: MealDrinkEvent[];
  cravings: CravingEvent[];
  onOpenLogModal: (isScheduled: boolean, targetWindow?: PlannedDoseWindow) => void;
  onOpenMealModal: () => void;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({
  wakeSession,
  plannedWindows,
  consumptionEvents,
  mealEvents,
  cravings,
  onOpenLogModal,
  onOpenMealModal
}) => {
  const timelineItems = buildDailyTimeline(
    wakeSession,
    plannedWindows,
    consumptionEvents,
    mealEvents,
    cravings
  );

  const getTimelineIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'wake':
        return <Sunrise size={15} className="text-amber-400" />;
      case 'planned_window':
        return <Clock size={15} className="text-cyan-400" />;
      case 'unplanned_dose':
        return <AlertTriangle size={15} className="text-amber-400" />;
      case 'meal_drink':
        return <Utensils size={15} className="text-indigo-400" />;
      case 'craving_resisted':
        return <ShieldCheck size={15} className="text-emerald-400" />;
      default:
        return <Clock size={15} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Daily Timeline & Schedule Status
        </h3>
        <button
          onClick={onOpenMealModal}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
        >
          <Plus size={13} />
          <span>Meal / Drink</span>
        </button>
      </div>

      {timelineItems.length === 0 ? (
        <Card className="p-5 text-center text-xs text-slate-400 space-y-1">
          <p>No timeline events recorded yet today.</p>
          <p className="text-[11px] text-slate-500">Tap "I just woke up" above to initialize today's schedule.</p>
        </Card>
      ) : (
        <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {timelineItems.map((item) => {
            const isClickable = item.type === 'planned_window' && item.rawEvent && item.rawEvent.status !== 'logged';

            return (
              <div
                key={item.id}
                className="relative flex items-start space-x-3 group"
              >
                {/* Timeline node icon */}
                <div className="absolute -left-5 mt-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 z-10">
                  {getTimelineIcon(item.type)}
                </div>

                {/* Content Card */}
                <div
                  onClick={() => {
                    if (isClickable) {
                      onOpenLogModal(true, item.rawEvent);
                    }
                  }}
                  className={`flex-1 p-3 rounded-2xl border transition-all ${
                    isClickable
                      ? 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400/60 cursor-pointer active:scale-[0.99]'
                      : 'bg-slate-900/50 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-100">{item.timeStr}</span>
                      <span className="font-semibold text-slate-200">{item.title}</span>
                    </div>
                    {item.statusBadge && (
                      <Badge variant={item.statusBadge.variant} size="sm">
                        {item.statusBadge.label}
                      </Badge>
                    )}
                  </div>

                  {item.subtitle && (
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {item.subtitle}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-1 border-t border-slate-800/60 pt-1">
                      "{item.notes}"
                    </p>
                  )}

                  {isClickable && (
                    <div className="mt-2 pt-1 border-t border-slate-800/60 flex justify-end">
                      <span className="text-[10px] font-bold text-cyan-400">
                        Tap to Log this Dose →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
