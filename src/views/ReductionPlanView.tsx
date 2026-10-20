import React, { useState } from 'react';
import {
  Target,
  Calendar,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Stethoscope,
  Info
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { ReductionPlan, PlanPhase, AppSettings } from '../types';
import { db, updateSettings } from '../db';
import { generateReductionPlan } from '../lib/calculations';

interface ReductionPlanViewProps {
  currentPlan: ReductionPlan | null;
  settings: AppSettings | null;
  onPlanUpdated: () => void;
}

export const ReductionPlanView: React.FC<ReductionPlanViewProps> = ({
  currentPlan,
  settings,
  onPlanUpdated
}) => {
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [editingTargetPhaseId, setEditingTargetPhaseId] = useState<string | null>(null);
  const [customTarget, setCustomTarget] = useState<number>(0);

  if (!currentPlan) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Target size={32} className="mx-auto text-cyan-400" />
        <h3 className="text-base font-bold text-slate-100">No Active Reduction Plan</h3>
        <p className="text-xs text-slate-400">
          Create a personalized reduction plan based on your current Nicotex baseline.
        </p>
        <Button
          variant="glow"
          size="md"
          onClick={async () => {
            if (settings) {
              const newPlan = generateReductionPlan(settings);
              await db.plans.put(newPlan);
              await updateSettings({ currentPlanId: newPlan.id });
              onPlanUpdated();
            }
          }}
        >
          Generate Reduction Plan
        </Button>
      </div>
    );
  }

  const activeIndex = currentPlan.currentPhaseIndex || 0;
  const isPaused = currentPlan.status === 'paused';

  const togglePausePlan = async () => {
    const updatedStatus = isPaused ? 'active' : 'paused';
    const updatedPlan: ReductionPlan = {
      ...currentPlan,
      status: updatedStatus,
      reviewHistory: [
        ...currentPlan.reviewHistory,
        {
          timestamp: Date.now(),
          notes: isPaused ? 'Resumed reduction plan.' : 'Paused reduction plan.',
          action: isPaused ? 'Resumed' : 'Paused'
        }
      ]
    };
    await db.plans.put(updatedPlan);
    onPlanUpdated();
  };

  const handleSelectPhase = async (index: number) => {
    const updatedPhases = currentPlan.phases.map((p, i) => {
      if (i < index) return { ...p, status: 'completed' as const };
      if (i === index) return { ...p, status: 'active' as const };
      return { ...p, status: 'upcoming' as const };
    });

    const updatedPlan: ReductionPlan = {
      ...currentPlan,
      currentPhaseIndex: index,
      phases: updatedPhases,
      reviewHistory: [
        ...currentPlan.reviewHistory,
        {
          timestamp: Date.now(),
          notes: `Switched active phase to ${currentPlan.phases[index].name}.`,
          action: 'Phase updated'
        }
      ]
    };

    await db.plans.put(updatedPlan);
    onPlanUpdated();
  };

  const saveCustomTarget = async (phaseId: string) => {
    const updatedPhases = currentPlan.phases.map(p => {
      if (p.id === phaseId) {
        return { ...p, targetPiecesPerDay: Math.max(0, customTarget) };
      }
      return p;
    });

    const updatedPlan: ReductionPlan = {
      ...currentPlan,
      phases: updatedPhases
    };

    await db.plans.put(updatedPlan);
    setEditingTargetPhaseId(null);
    onPlanUpdated();
  };

  return (
    <div className="space-y-5 pb-24 max-w-md mx-auto px-4 pt-4">
      {/* Plan Header Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Configurable Reduction Plan
            </span>
            <h2 className="text-base font-extrabold text-slate-100">{currentPlan.title}</h2>
          </div>
          <Badge
            variant={isPaused ? 'amber' : 'emerald'}
            size="md"
          >
            {isPaused ? 'Paused' : 'Active'}
          </Badge>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Gradual, self-paced reduction designed to prevent severe withdrawal and rebound. You are always in control of your progression.
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={togglePausePlan}
          >
            {isPaused ? <Play size={14} className="mr-1.5 text-emerald-400" /> : <Pause size={14} className="mr-1.5 text-amber-400" />}
            {isPaused ? 'Resume Plan' : 'Pause Plan'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (confirm('Regenerate the reduction plan based on your current settings?')) {
                if (settings) {
                  const refreshed = generateReductionPlan(settings);
                  await db.plans.put(refreshed);
                  await updateSettings({ currentPlanId: refreshed.id });
                  onPlanUpdated();
                }
              }
            }}
          >
            <RotateCcw size={14} className="mr-1.5" /> Reset Plan
          </Button>
        </div>
      </Card>

      {/* Safety & Clinical Transparency Notice (Section 9 Non-Negotiables) */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs">
          <Stethoscope size={16} />
          <span>Clinical & Safety Transparency</span>
        </div>
        <ul className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed pl-1">
          <li>
            • <strong>Absorption Dynamics:</strong> A 2mg piece does not deliver 2mg directly into the bloodstream; buccal absorption is gradual (~50%), unlike cigarettes.
          </li>
          <li>
            • <strong>No Compensatory Use:</strong> Never chew two pieces at once or smoke cigarettes to compensate for reduced gum intake.
          </li>
          <li>
            • <strong>No Forced Progression:</strong> Meeting your daily target does not automatically force you to advance to a lower target until you feel ready.
          </li>
          <li>
            • <strong>Medical Advice:</strong> If you experience persistent chest tightness, severe palpitations, or depression, consult your physician or pharmacist.
          </li>
        </ul>
      </div>

      {/* Reduction Phases List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Plan Milestones ({currentPlan.phases.length} Phases)
        </h3>

        {currentPlan.phases.map((phase, idx) => {
          const isActive = idx === activeIndex;
          const isCompleted = idx < activeIndex;
          const isExpanded = expandedPhaseId === phase.id;

          return (
            <Card
              key={phase.id}
              className={`p-4 space-y-3 transition-all ${
                isActive
                  ? 'border-cyan-500/50 bg-slate-900 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/60 opacity-90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-cyan-400">
                      Phase {idx}
                    </span>
                    {isActive && (
                      <Badge variant="cyan" size="sm">Current Phase</Badge>
                    )}
                    {isCompleted && (
                      <Badge variant="emerald" size="sm">Completed</Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">{phase.name}</h4>
                </div>

                <div className="text-right">
                  <div className="text-base font-black font-mono text-slate-100">
                    {phase.targetPiecesPerDay} <span className="text-xs text-slate-400 font-normal">pieces/day</span>
                  </div>
                  <span className="text-[10px] text-slate-500">~{phase.durationDays} days</span>
                </div>
              </div>

              {/* Rationale snippet */}
              <p className="text-xs text-slate-400 leading-relaxed">
                {phase.rationale}
              </p>

              {/* Planned Consumption Windows */}
              {phase.plannedWindows && phase.plannedWindows.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Suggested Windows (Optional pacing, never mandatory):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.plannedWindows.map(w => (
                      <span
                        key={w}
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono border border-slate-700/60"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Expand details & Controls */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium"
                >
                  <span>{isExpanded ? 'Hide Details' : 'View Criteria'}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectPhase(idx)}
                    className="text-xs py-1 h-8"
                  >
                    Set as Current
                  </Button>
                )}

                {isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTargetPhaseId(phase.id);
                      setCustomTarget(phase.targetPiecesPerDay);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
                  >
                    Adjust Target
                  </button>
                )}
              </div>

              {/* Expanded Criteria */}
              {isExpanded && (
                <div className="p-3 rounded-2xl bg-slate-800/40 text-xs text-slate-300 space-y-1.5 border border-slate-700/60 animate-in fade-in">
                  <p><strong>Review Criteria:</strong> {phase.reviewCriteria}</p>
                </div>
              )}

              {/* Editing Target Inline */}
              {editingTargetPhaseId === phase.id && (
                <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 space-y-2 animate-in fade-in">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Custom Target Pieces Per Day:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={customTarget}
                      onChange={e => setCustomTarget(Number(e.target.value))}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-100"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => saveCustomTarget(phase.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTargetPhaseId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
