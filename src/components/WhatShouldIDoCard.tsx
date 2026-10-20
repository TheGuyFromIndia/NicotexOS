import React from 'react';
import {
  HelpCircle,
  Sunrise,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  Utensils
} from 'lucide-react';
import { Card } from './ui/Card';
import type {
  DailyWakeSession,
  PlannedDoseWindow,
  ConsumptionEvent,
  MealDrinkEvent
} from '../types';
import { formatCountdown, formatElapsedTime, checkFoodDrinkConflict, checkSpacingConstraint } from '../lib/calculations';

interface WhatShouldIDoCardProps {
  wakeSession: DailyWakeSession | null;
  plannedWindows: PlannedDoseWindow[];
  consumptionEvents: ConsumptionEvent[];
  mealEvents: MealDrinkEvent[];
  onActionClick?: (actionType: string) => void;
}

export const WhatShouldIDoCard: React.FC<WhatShouldIDoCardProps> = ({
  wakeSession,
  plannedWindows,
  consumptionEvents,
  mealEvents,
  onActionClick
}) => {
  const now = Date.now();

  // Find active chewing session
  const activeSession = consumptionEvents.find(c => c.sessionStatus === 'active') || null;

  // Last actual consumption
  const sortedActual = [...consumptionEvents].sort((a, b) => b.timestamp - a.timestamp);
  const lastActual = sortedActual[0] || null;

  // Next planned window
  const sortedWindows = [...plannedWindows].sort((a, b) => a.originalPlannedTimestamp - b.originalPlannedTimestamp);
  const nextPlanned = sortedWindows.find(w => w.status !== 'logged' && w.originalPlannedTimestamp > now) || null;
  const overdueWindow = sortedWindows.find(w => w.status !== 'logged' && w.originalPlannedTimestamp <= now) || null;

  // Food & drink conflicts
  const conflict = checkFoodDrinkConflict(plannedWindows, mealEvents, activeSession, now);

  // Spacing constraint check
  const spacing = checkSpacingConstraint(
    lastActual ? (lastActual.startTime || lastActual.timestamp) : null,
    nextPlanned ? nextPlanned.originalPlannedTimestamp : null
  );

  // 1. No wake session recorded
  if (!wakeSession) {
    return (
      <Card className="p-4 bg-slate-900 border-amber-500/30 space-y-2">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
          <Sunrise size={16} />
          <span>What should I do now?</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          You haven't recorded waking up today. Tap <strong>"I just woke up"</strong> above to generate today's schedule and start the countdown to your first dose.
        </p>
      </Card>
    );
  }

  // 2. Active chewing session
  if (activeSession) {
    const elapsedChewing = formatElapsedTime(activeSession.startTime || activeSession.timestamp, now).formatted;
    return (
      <Card className="p-4 bg-cyan-950/30 border-cyan-500/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
            <Sparkles size={16} />
            <span>Active Session ({elapsedChewing})</span>
          </div>
          <span className="text-[10px] text-cyan-300 font-semibold uppercase">Chew & Park Technique</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          Chew slowly until you notice a peppery taste. <strong>Park</strong> the gum between your cheek and gum for 1 minute. When taste fades, chew again. Repeat for ~30 minutes. <em>Do not eat or drink with gum in your mouth.</em>
        </p>
      </Card>
    );
  }

  // 3. Interrupted session recently
  if (lastActual && lastActual.sessionStatus === 'interrupted' && now - lastActual.timestamp < 60 * 60 * 1000) {
    return (
      <Card className="p-4 bg-slate-900 border-slate-700 space-y-2">
        <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs">
          <Info size={16} />
          <span>Session Stopped Early</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your last gum session was stopped early ({lastActual.interruptionReason || 'interrupted'}). It counts as a piece consumed today. <strong>Do not chew extra gum or take another piece to compensate.</strong> Follow product instructions and wait for your next planned window.
        </p>
      </Card>
    );
  }

  // 4. Overdue window
  if (overdueWindow) {
    const overdueMins = Math.floor((now - overdueWindow.originalPlannedTimestamp) / 60000);
    return (
      <Card className="p-4 bg-amber-950/25 border-amber-800/40 space-y-2">
        <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
          <AlertCircle size={16} />
          <span>Scheduled window passed ({overdueMins}m ago)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your {overdueWindow.originalPlannedTime} window passed without a logged piece. You are not required to consume it if you have no craving. An overdue dose is <strong>never permission to take extra gum or double up</strong>.
        </p>
      </Card>
    );
  }

  // 5. Food/Drink conflict approaching
  if (conflict.hasConflict && conflict.warningMessage) {
    return (
      <Card className="p-4 bg-indigo-950/30 border-indigo-700/50 space-y-2">
        <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
          <Utensils size={16} />
          <span>Meal / Beverage Timing Reminder</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          {conflict.warningMessage}
        </p>
      </Card>
    );
  }

  // 6. Spacing conflict after an unplanned piece
  if (spacing.hasConflict && spacing.message) {
    return (
      <Card className="p-4 bg-slate-900 border-amber-500/40 space-y-2">
        <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
          <Clock size={16} />
          <span>Spacing Guideline Notice</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {spacing.message}
        </p>
      </Card>
    );
  }

  // 7. Normal countdown to next window
  if (nextPlanned) {
    const countdown = formatCountdown(nextPlanned.originalPlannedTimestamp - now);
    return (
      <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-300 font-bold">
            <CheckCircle2 size={16} className="text-cyan-400" />
            <span>Next Planned Window</span>
          </div>
          <span className="text-cyan-400 font-mono font-bold">{nextPlanned.originalPlannedTime} (in {countdown})</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          No action needed right now. If an urge strikes before your window, tap <strong>"I'm Craving"</strong> to pause and surf the urge with water or breathing.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-1 text-xs">
      <div className="flex items-center space-x-2 text-emerald-400 font-bold">
        <CheckCircle2 size={16} />
        <span>All Scheduled Windows Complete</span>
      </div>
      <p className="text-slate-400">
        You have reached the end of today's planned windows. Rest well tonight.
      </p>
    </Card>
  );
};
