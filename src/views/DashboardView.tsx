import React, { useState, useEffect } from 'react';
import {
  Plus,
  ShieldAlert,
  Flame,
  Clock,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Utensils,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { WakeUpCard } from '../components/WakeUpCard';
import { DoseTimerCard } from '../components/DoseTimerCard';
import { WhatShouldIDoCard } from '../components/WhatShouldIDoCard';
import { DailyTimeline } from '../components/DailyTimeline';
import { CostOfAddictionCard } from '../components/CostOfAddictionCard';
import { RepeatPurchaseAlertCard } from '../components/RepeatPurchaseAlertCard';
import type {
  AppSettings,
  ConsumptionEvent,
  CravingEvent,
  ReductionPlan,
  DailyWakeSession,
  PlannedDoseWindow,
  MealDrinkEvent,
  PurchaseRecord
} from '../types';
import { getLocalDateString } from '../db';
import {
  calculateCostPerPiece,
  calculateExpenditure,
  calculateAvoidedExpenditure,
  formatElapsedTime,
  calculateSevenDayRollingAverage,
  calculateStreaks,
  calculateAverageInterval
} from '../lib/calculations';

interface DashboardViewProps {
  settings: AppSettings | null;
  currentPlan: ReductionPlan | null;
  consumption: ConsumptionEvent[];
  cravings: CravingEvent[];
  purchases: PurchaseRecord[];
  wakeSession: DailyWakeSession | null;
  plannedWindows: PlannedDoseWindow[];
  mealEvents: MealDrinkEvent[];
  onOpenLogModal: (isScheduled: boolean, targetWindow?: PlannedDoseWindow | null, existingEvent?: ConsumptionEvent | null) => void;
  onOpenCravingModal: () => void;
  onOpenPurchaseModal: (purchase?: PurchaseRecord) => void;
  onOpenInterruptionModal: () => void;
  onNavigateToSpending: () => void;
  onQuickLog: () => void;
  onNavigateToPlan: () => void;
  onOpenMealModal: () => void;
  onWakeSessionUpdated: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  currentPlan,
  consumption,
  cravings,
  purchases,
  wakeSession,
  plannedWindows,
  mealEvents,
  onOpenLogModal,
  onOpenCravingModal,
  onOpenPurchaseModal,
  onOpenInterruptionModal,
  onNavigateToSpending,
  onQuickLog,
  onNavigateToPlan,
  onOpenMealModal,
  onWakeSessionUpdated
}) => {
  const todayStr = getLocalDateString();
  const [now, setNow] = useState<number>(Date.now());

  // Check for recent repeat purchase that has not been acknowledged
  const unacknowledgedRepeat = purchases
    .filter(p => p.isRepeatPurchase && !p.acknowledgedRepeat)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  // Update timer live every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter today's consumption
  const todayEvents = consumption.filter(e => e.localDateStr === todayStr);
  const todayCount = todayEvents.reduce((acc, e) => acc + (e.quantity || 1), 0);

  // Active Phase & Target
  const activePhase = currentPlan?.phases[currentPlan.currentPhaseIndex || 0];
  const targetPieces = activePhase ? activePhase.targetPiecesPerDay : (settings?.baselinePiecesPerDay || 8);
  const isOverTarget = todayCount > targetPieces;
  const remainingAllowance = Math.max(0, targetPieces - todayCount);

  // Last Consumption
  const sortedConsumption = [...consumption].sort((a, b) => b.timestamp - a.timestamp);
  const lastEvent = sortedConsumption[0];
  const elapsed = lastEvent ? formatElapsedTime(lastEvent.startTime || lastEvent.timestamp, now) : null;

  // Unplanned and Interrupted counts today
  const unplannedToday = todayEvents.filter(e => !e.isScheduled).length;
  const interruptedToday = todayEvents.filter(e => e.sessionStatus === 'interrupted').length;

  // Financial Cost Metrics
  const packPrice = settings?.packPrice || 115;
  const packQuantity = settings?.packQuantity || 9;
  const currency = settings?.currency || '₹';
  const costPerPiece = calculateCostPerPiece(packPrice, packQuantity);

  const totalPiecesAllTime = consumption.reduce((acc, e) => acc + (e.quantity || 1), 0);
  const totalSpentAllTime = calculateExpenditure(totalPiecesAllTime, costPerPiece);
  const spentToday = calculateExpenditure(todayCount, costPerPiece);

  // Spending this week (last 7 days)
  const rolling7DayAvg = calculateSevenDayRollingAverage(consumption, todayStr);
  const estimatedMonthlySpending = Number((rolling7DayAvg * 30 * costPerPiece).toFixed(0));

  // Avoided spending compared to baseline
  const uniqueDatesCount = Math.max(1, new Set(consumption.map(c => c.localDateStr)).size);
  const avoidedStats = calculateAvoidedExpenditure(
    settings?.baselinePiecesPerDay || 8,
    totalPiecesAllTime,
    uniqueDatesCount,
    costPerPiece
  );

  // Streaks
  const streakStats = calculateStreaks(consumption, targetPieces, undefined, todayStr);

  // Average time between pieces
  const avgIntervalMin = calculateAverageInterval(consumption);

  // Cravings managed without consumption
  const cravingsResisted = cravings.filter(c => c.outcome === 'resisted' || c.outcome === 'postponed').length;

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto px-4 pt-4">
      {/* Exceeded Target Supportive Banner (Relapse-Resistant Phrasing) */}
      {isOverTarget && (
        <div className="p-4 rounded-3xl bg-amber-950/30 border border-amber-800/40 space-y-2 animate-in fade-in">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
            <AlertTriangle size={16} />
            <span>Target exceeded today ({todayCount}/{targetPieces})</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            You exceeded today's target. Your progress over the past two weeks still counts. Would you like to record what happened and continue with your plan?
          </p>
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenLogModal(false, null, lastEvent)}
              className="text-xs text-amber-300 border-amber-800/60 hover:bg-amber-950/40"
            >
              Add reflection note
            </Button>
          </div>
        </div>
      )}

      {/* Repeat Purchase Contextual Alert (if unacknowledged rapid order detected) */}
      {unacknowledgedRepeat && (
        <RepeatPurchaseAlertCard
          recentRepeatPurchase={unacknowledgedRepeat}
          motivations={settings?.financialMotivations || []}
          onAcknowledged={() => {}}
        />
      )}

      {/* Prominent "The Cost of Nicotex" Section */}
      <CostOfAddictionCard
        purchases={purchases}
        consumptionEvents={consumption}
        settings={settings}
        onOpenPurchaseModal={() => onOpenPurchaseModal()}
        onOpenInterruptionModal={onOpenInterruptionModal}
        onNavigateToSpending={onNavigateToSpending}
      />

      {/* 1. Wake-Up Card / Start of Day Workflow */}
      <WakeUpCard
        wakeSession={wakeSession}
        settings={settings}
        targetPieces={targetPieces}
        onWakeSessionUpdated={onWakeSessionUpdated}
      />

      {/* 2. Persistent Live Dose Timers */}
      <DoseTimerCard
        plannedWindows={plannedWindows}
        consumptionEvents={todayEvents}
        onOpenLogModal={(isScheduled, window) => onOpenLogModal(isScheduled, window)}
      />

      {/* 3. Action Buttons: Scheduled Dose, Unplanned Dose, Craving Interceptor */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={() => onOpenLogModal(true)}
            className="flex items-center justify-center py-3 rounded-2xl text-xs font-extrabold shadow-cyan-500/20"
          >
            <Clock size={15} className="mr-1.5" />
            <span>Log Scheduled Dose</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => onOpenLogModal(false)}
            className="flex items-center justify-center py-3 rounded-2xl text-xs font-extrabold text-amber-300 border-amber-500/30 hover:bg-slate-800 active:border-amber-400"
          >
            <AlertTriangle size={15} className="mr-1.5 text-amber-400" />
            <span>Log Unplanned Dose</span>
          </Button>
        </div>

        {/* Craving Interception Button */}
        <Button
          variant="glow"
          size="md"
          fullWidth
          onClick={onOpenCravingModal}
          className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 text-slate-950 py-3 rounded-2xl font-bold shadow-amber-500/15"
        >
          <ShieldAlert size={17} className="mr-2 text-slate-950" />
          <span>I'm Craving Nicotex (3-Min Pause)</span>
        </Button>
      </div>

      {/* 4. Quick "What should I do now?" Guidance Panel */}
      <WhatShouldIDoCard
        wakeSession={wakeSession}
        plannedWindows={plannedWindows}
        consumptionEvents={todayEvents}
        mealEvents={mealEvents}
      />

      {/* 5. Daily Consumption & Allowance Card */}
      <Card className="relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today's Consumption
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black tracking-tight text-slate-100">
                {todayCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {targetPieces} target
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <Badge
              variant={isOverTarget ? 'amber' : 'emerald'}
              size="md"
            >
              {isOverTarget ? 'Exceeded' : 'On Schedule'}
            </Badge>
            <p className="text-[11px] text-slate-400">
              {isOverTarget
                ? `${todayCount - targetPieces} above plan`
                : `${remainingAllowance} remaining allowance`}
            </p>
          </div>
        </div>

        <ProgressBar
          value={todayCount}
          max={targetPieces}
          variant={isOverTarget ? 'amber' : 'cyan'}
        />

        {/* Breakdown row: Unplanned & Interrupted sessions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Unplanned: <strong className="text-amber-400">{unplannedToday}</strong></span>
          <span>Interrupted: <strong className="text-slate-300">{interruptedToday}</strong></span>
          <span>Last: <strong className="text-slate-200">{elapsed ? elapsed.formatted : 'None'}</strong></span>
        </div>
      </Card>

      {/* 6. Visual Timeline & Meal Planning */}
      <DailyTimeline
        wakeSession={wakeSession}
        plannedWindows={plannedWindows}
        consumptionEvents={todayEvents}
        mealEvents={mealEvents}
        cravings={cravings}
        onOpenLogModal={(isScheduled, window) => onOpenLogModal(isScheduled, window)}
        onOpenMealModal={onOpenMealModal}
      />

      {/* 7. Adherence Streak & Rolling Average */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-1.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Adherence Streak</span>
            <Flame size={16} className="text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-100">{streakStats.currentStreak}</span>
            <span className="text-xs text-slate-400">days</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Best streak: <strong className="text-slate-300">{streakStats.bestStreak} days</strong>
          </p>
        </Card>

        <Card className="space-y-1.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">7-Day Rolling Avg</span>
            <TrendingDown size={16} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-100">{rolling7DayAvg}</span>
            <span className="text-xs text-slate-400">pieces/day</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Baseline: <strong className="text-slate-300">{settings?.baselinePiecesPerDay || 8}/day</strong>
          </p>
        </Card>
      </div>

      {/* Reduction Plan Snapshot */}
      <Card
        interactive
        onClick={onNavigateToPlan}
        className="space-y-3 cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reduction Engine
            </span>
          </div>
          <ChevronRight size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-slate-100">
            {activePhase?.name || 'Phase 0: Baseline Observation'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {activePhase?.rationale || 'Observing natural consumption patterns and craving triggers.'}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Cravings Resisted: <strong className="text-cyan-400">{cravingsResisted}</strong></span>
          <span>Avg Gap: <strong className="text-slate-200">{avgIntervalMin ? `${avgIntervalMin}m` : '—'}</strong></span>
        </div>
      </Card>
    </div>
  );
};
