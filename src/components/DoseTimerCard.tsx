import React, { useState, useEffect } from 'react';
import {
  Clock,
  Hourglass,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type { PlannedDoseWindow, ConsumptionEvent } from '../types';
import { calculateDoseTimers, formatCountdown } from '../lib/calculations';

interface DoseTimerCardProps {
  plannedWindows: PlannedDoseWindow[];
  consumptionEvents: ConsumptionEvent[];
  onOpenLogModal: (isScheduled: boolean, targetWindow?: PlannedDoseWindow) => void;
}

export const DoseTimerCard: React.FC<DoseTimerCardProps> = ({
  plannedWindows,
  consumptionEvents,
  onOpenLogModal
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Update timers every 10 seconds for real-time responsiveness
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const timerData = calculateDoseTimers(plannedWindows, consumptionEvents, now);

  const {
    timeUntilNextPlannedMs,
    nextPlannedWindow,
    timeSinceLastActualFormatted,
    overdueWindow,
    overdueMinutes,
    timeSinceLastScheduledFormatted,
    lastScheduledWindow,
    activeSession,
    unplannedTodayCount,
    interruptedTodayCount
  } = timerData;

  const completedWindows = plannedWindows.filter(w => w.status === 'logged').length;
  const totalWindows = plannedWindows.length;

  return (
    <Card className="space-y-4 p-5 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border-cyan-500/30 shadow-lg shadow-cyan-950/20">
      {/* Active Gum Chewing Banner (if in session) */}
      {activeSession && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 flex items-center justify-between animate-pulse">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-300">
              Active Chewing Session
            </span>
            <p className="text-xs text-slate-200">
              Chew slowly & park between cheek and gum
            </p>
          </div>
          <button
            onClick={() => onOpenLogModal(true)}
            className="text-xs px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold active:scale-95 transition-all"
          >
            Finish / Stop
          </button>
        </div>
      )}

      {/* Overdue Scheduled Window Banner (if any) */}
      {overdueWindow && (
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
              <AlertTriangle size={15} />
              <span>Dose window overdue by {overdueMinutes}m</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scheduled at {overdueWindow.originalPlannedTime}. This dose was not logged. Do not double up.
            </p>
          </div>
          <button
            onClick={() => onOpenLogModal(true, overdueWindow)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold active:scale-95 transition-all shrink-0 ml-2"
          >
            Log Now
          </button>
        </div>
      )}

      {/* Main Grid: Live Timers */}
      <div className="grid grid-cols-2 gap-3">
        {/* Timer 1: Time until next planned dose */}
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Next Planned In</span>
            <Hourglass size={14} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300 tracking-tight">
            {timeUntilNextPlannedMs !== null ? formatCountdown(timeUntilNextPlannedMs) : 'None'}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {nextPlannedWindow ? `Window #${nextPlannedWindow.windowIndex + 1} at ${nextPlannedWindow.originalPlannedTime}` : 'All doses completed'}
          </p>
        </div>

        {/* Timer 2: Time since last actual dose */}
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Since Last Piece</span>
            <Clock size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-100 tracking-tight">
            {timeSinceLastActualFormatted}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {timerData.lastActualConsumption ? `Trigger: ${timerData.lastActualConsumption.trigger}` : 'No pieces yet today'}
          </p>
        </div>
      </div>

      {/* Secondary Status Row: Last Scheduled Window & Today's Adherence */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          <span>Scheduled Windows: </span>
          <strong className="text-slate-200 font-mono">
            {completedWindows}/{totalWindows}
          </strong>
          {unplannedTodayCount > 0 && (
            <span className="text-amber-400 ml-1.5">
              (+{unplannedTodayCount} unplanned)
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="text-slate-400">Last sched: </span>
          <span className="text-slate-300 font-medium font-mono">
            {timeSinceLastScheduledFormatted}
          </span>
        </div>
      </div>
    </Card>
  );
};
