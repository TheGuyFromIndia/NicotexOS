import React from 'react';
import {
  ShieldAlert,
  Wind,
  Droplets,
  Footprints,
  Flame,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingDown,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { CravingEvent, ConsumptionEvent } from '../types';
import { calculateCravingStats } from '../lib/calculations';

interface CravingsViewProps {
  cravings: CravingEvent[];
  consumption: ConsumptionEvent[];
  onOpenCravingModal: () => void;
  onOpenLogModal: (existingEvent?: ConsumptionEvent | null) => void;
}

export const CravingsView: React.FC<CravingsViewProps> = ({
  cravings,
  consumption,
  onOpenCravingModal,
  onOpenLogModal
}) => {
  const stats = calculateCravingStats(cravings);
  const sortedCravings = [...cravings].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-5 pb-24 max-w-md mx-auto px-4 pt-4">
      {/* Launch Craving Interception */}
      <Card className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/30 p-5 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-100">Craving Interceptor</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Urges typically peak and subside in 3 to 5 minutes.
            </p>
          </div>
        </div>

        <Button
          variant="glow"
          size="lg"
          fullWidth
          onClick={onOpenCravingModal}
          className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 text-slate-950 shadow-amber-500/20"
        >
          <span className="flex items-center justify-center">
            I'm Craving Nicotex Right Now <ArrowRight size={18} className="ml-2" />
          </span>
        </Button>
      </Card>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-1.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Managed Rate</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-100 font-mono">
              {stats.managedWithoutConsumptionPct}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {stats.resistedCount + stats.postponedCount} of {stats.total} urges delayed or resisted
          </p>
        </Card>

        <Card className="space-y-1.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Intensity Shift</span>
            <TrendingDown size={16} className="text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-black text-slate-100 font-mono">
              {stats.avgInitialIntensity} <span className="text-slate-500 text-sm">→</span> {stats.avgFinalIntensity}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Average post-pause intensity drop
          </p>
        </Card>
      </div>

      {/* Common Triggers & Effective Interventions */}
      {stats.commonTriggers.length > 0 && (
        <Card className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Observed Triggers & Interventions
          </h3>

          <div className="space-y-2">
            {stats.commonTriggers.slice(0, 4).map(item => (
              <div key={item.trigger} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-200 font-medium">{item.trigger}</span>
                  <span className="text-slate-400 font-mono">{item.count} urges</span>
                </div>
                <ProgressBar
                  value={item.count}
                  max={stats.total}
                  variant="amber"
                />
              </div>
            ))}
          </div>

          {stats.effectiveInterventions.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Top Delay Strategies:
              </span>
              <div className="space-y-1.5">
                {stats.effectiveInterventions.slice(0, 3).map(inv => (
                  <div
                    key={inv.intervention}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 text-xs"
                  >
                    <span className="text-slate-300 font-medium">{inv.intervention}</span>
                    <Badge variant="emerald" size="sm">
                      {inv.successRate}% delay rate
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-500 italic">
            * Note: These metrics reflect observational correlations, not proven causation.
          </p>
        </Card>
      )}

      {/* Craving History Log */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Recent Craving Records ({cravings.length})
        </h4>

        {sortedCravings.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-1">
            <p className="text-xs text-slate-400">No craving events recorded yet.</p>
            <p className="text-[11px] text-slate-500">
              When an urge strikes, tap "I'm Craving" above to activate the 3-minute pause.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedCravings.slice(0, 15).map(c => {
              const d = new Date(c.timestamp);
              const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const isSuccess = c.outcome === 'resisted' || c.outcome === 'postponed';

              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200">{timeStr}</span>
                      <span className="text-slate-500 text-[11px]">{dateStr}</span>
                    </div>

                    <Badge
                      variant={isSuccess ? 'emerald' : 'amber'}
                      size="sm"
                    >
                      {c.outcome === 'resisted' ? 'Resisted' : c.outcome === 'postponed' ? 'Postponed' : 'Chewed'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Trigger: <strong className="text-slate-300">{c.trigger}</strong></span>
                    <span>
                      Intensity: <strong className="text-amber-400">{c.initialIntensity}</strong>
                      {c.finalIntensity !== undefined && (
                        <span> → <strong className="text-cyan-400">{c.finalIntensity}</strong></span>
                      )}
                    </span>
                  </div>

                  {c.intervention && (
                    <div className="text-[11px] text-slate-400 pt-0.5">
                      Strategy used: <span className="text-slate-300">{c.intervention}</span>
                    </div>
                  )}

                  {c.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                      "{c.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
