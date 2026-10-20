import React, { useState, useEffect } from 'react';
import {
  Plus,
  ShieldAlert,
  Flame,
  Clock,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { AppSettings, ConsumptionEvent, CravingEvent, ReductionPlan } from '../types';
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
  onOpenLogModal: (existingEvent?: ConsumptionEvent | null) => void;
  onOpenCravingModal: () => void;
  onQuickLog: () => void;
  onNavigateToPlan: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  currentPlan,
  consumption,
  cravings,
  onOpenLogModal,
  onOpenCravingModal,
  onQuickLog,
  onNavigateToPlan
}) => {
  const todayStr = getLocalDateString();
  const [now, setNow] = useState<number>(Date.now());

  // Update timer live every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
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
  const elapsed = lastEvent ? formatElapsedTime(lastEvent.timestamp, now) : null;

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
  const estimatedAnnualSpending = Number((rolling7DayAvg * 365 * costPerPiece).toFixed(0));

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
    <div className="space-y-5 pb-24 max-w-md mx-auto px-4 pt-4">
      {/* Exceeded Target Supportive Banner */}
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
              onClick={() => onOpenLogModal(lastEvent)}
              className="text-xs text-amber-300 border-amber-800/60 hover:bg-amber-950/40"
            >
              Add reflection note
            </Button>
          </div>
        </div>
      )}

      {/* Primary Action Buttons (Section 7 & 8) */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="glow"
          size="lg"
          onClick={() => onOpenLogModal(null)}
          className="flex flex-col items-center justify-center py-4 h-auto space-y-1 rounded-3xl shadow-cyan-500/15"
        >
          <div className="flex items-center space-x-1.5">
            <Plus size={18} className="stroke-[3]" />
            <span className="text-base font-extrabold tracking-tight">Log Nicotex</span>
          </div>
          <span className="text-[11px] font-medium text-slate-900/80">
            {settings?.strength || '2mg'} piece
          </span>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={onOpenCravingModal}
          className="flex flex-col items-center justify-center py-4 h-auto space-y-1 rounded-3xl bg-slate-900/90 border-amber-500/30 text-amber-200 hover:bg-slate-800 shadow-md active:border-amber-400"
        >
          <div className="flex items-center space-x-1.5">
            <ShieldAlert size={18} className="text-amber-400 stroke-[2.5]" />
            <span className="text-base font-extrabold tracking-tight text-slate-100">I'm Craving</span>
          </div>
          <span className="text-[11px] font-medium text-amber-300/80">
            3-min pause timer
          </span>
        </Button>
      </div>

      {/* Main Today Tracker Card */}
      <Card className="relative overflow-hidden space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today's Consumption
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black tracking-tight text-slate-100">
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
                : `${remainingAllowance} remaining under target`}
            </p>
          </div>
        </div>

        <ProgressBar
          value={todayCount}
          max={targetPieces}
          variant={isOverTarget ? 'amber' : 'cyan'}
        />

        {/* Last Consumption Status */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <Clock size={15} className="text-cyan-400" />
            <span>Last piece:</span>
            <span className="font-semibold text-slate-200">
              {elapsed ? elapsed.formatted : 'None today'}
            </span>
          </div>

          {lastEvent && (
            <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
              "{lastEvent.trigger}"
            </span>
          )}
        </div>
      </Card>

      {/* Streak & Adherence Counter */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-2 p-4">
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

        <Card className="space-y-2 p-4">
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

      {/* Financial Cost Card (Section 6.A) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <span className="font-bold text-xs">{currency}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-200">Financial Expenditure</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {currency}{costPerPiece}/piece
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Today</span>
            <span className="text-sm font-bold text-slate-100 font-mono">
              {currency}{spentToday}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Monthly Rate</span>
            <span className="text-sm font-bold text-slate-100 font-mono">
              {currency}{estimatedMonthlySpending}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">All-Time</span>
            <span className="text-sm font-bold text-slate-100 font-mono">
              {currency}{totalSpentAllTime}
            </span>
          </div>
        </div>

        {/* Avoided expenditure estimate banner */}
        <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-emerald-300 block">
              Estimated Avoided Expenditure:
            </span>
            <span className="text-[10px] text-slate-400 block">
              Based on {avoidedStats.piecesSaved} pieces avoided vs baseline estimate
            </span>
          </div>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            ~{currency}{avoidedStats.avoidedAmount}
          </span>
        </div>
      </Card>

      {/* Progress & Reduction Phase Snapshot */}
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

      {/* Today's Logged Entries */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Today's Log ({todayEvents.length})
          </h4>
          <button
            onClick={onQuickLog}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            + Quick Log
          </button>
        </div>

        {todayEvents.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-1">
            <p className="text-xs text-slate-400">No Nicotex pieces recorded today yet.</p>
            <p className="text-[11px] text-slate-500">Tap "Log Nicotex" whenever you chew a piece.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map(event => {
              const d = new Date(event.timestamp);
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={event.id}
                  onClick={() => onOpenLogModal(event)}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200">{timeStr}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {event.strength}
                      </span>
                      {event.isScheduled && (
                        <span className="text-[10px] text-emerald-400 font-medium">Scheduled</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-[220px]">
                      {event.trigger}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
