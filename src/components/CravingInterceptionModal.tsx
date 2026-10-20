import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Wind,
  Droplets,
  Footprints,
  Shuffle,
  Waves,
  Timer,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { BreathingExercise } from './BreathingExercise';
import {
  CRAVING_TRIGGERS,
  INTERVENTION_TYPES,
  type CravingTrigger,
  type CravingEvent,
  type AppSettings
} from '../types';
import { db, getLocalDateString } from '../db';

interface CravingInterceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  onCravingRecorded?: () => void;
  onOpenLogGum?: (cravingId: string) => void;
}

export const CravingInterceptionModal: React.FC<CravingInterceptionModalProps> = ({
  isOpen,
  onClose,
  settings,
  onCravingRecorded,
  onOpenLogGum
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Identification
  const [trigger, setTrigger] = useState<CravingTrigger>('Stress');
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [initialIntensity, setInitialIntensity] = useState<number>(7);
  const [cravingStartTime, setCravingStartTime] = useState<number>(Date.now());

  // Step 2: Intervention & Timer
  const [selectedIntervention, setSelectedIntervention] = useState<string>('breathing');
  const [timerDurationSeconds, setTimerDurationSeconds] = useState<number>(180); // 3 minutes default
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerStartTimestampRef = useRef<number | null>(null);

  // Step 3: Outcome
  const [finalIntensity, setFinalIntensity] = useState<number>(3);
  const [outcome, setOutcome] = useState<'resisted' | 'postponed' | 'consumed'>('resisted');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTrigger('Stress');
      setCustomTrigger('');
      setInitialIntensity(7);
      setFinalIntensity(3);
      setSelectedIntervention('breathing');
      setTimerDurationSeconds(180);
      setSecondsRemaining(180);
      setTimerActive(false);
      timerStartTimestampRef.current = null;
      setCravingStartTime(Date.now());
      setOutcome('resisted');
      setNotes('');
    }
  }, [isOpen]);

  // Backgrounding-safe timer: uses Date.now() comparison
  useEffect(() => {
    if (!timerActive || step !== 2) return;

    if (!timerStartTimestampRef.current) {
      timerStartTimestampRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (timerStartTimestampRef.current || now)) / 1000);
      const remaining = Math.max(0, timerDurationSeconds - elapsed);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        setTimerActive(false);
        setStep(3); // auto transition to outcome reflection
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timerActive, step, timerDurationSeconds]);

  const startTimer = (duration: number) => {
    setTimerDurationSeconds(duration);
    setSecondsRemaining(duration);
    timerStartTimestampRef.current = Date.now();
    setTimerActive(true);
  };

  const handleFinishOutcome = async (didConsume: boolean = false) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const cravingId = `crav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const activeOutcome = didConsume ? 'consumed' : outcome;
      const interventionObj = INTERVENTION_TYPES.find(i => i.id === selectedIntervention);

      const cravingRecord: CravingEvent = {
        id: cravingId,
        timestamp: cravingStartTime,
        localDateStr: getLocalDateString(new Date(cravingStartTime)),
        trigger: trigger === 'Other' && customTrigger ? customTrigger : trigger,
        initialIntensity,
        finalIntensity: didConsume ? Math.max(initialIntensity, finalIntensity) : finalIntensity,
        intervention: interventionObj ? interventionObj.label : 'None',
        outcome: activeOutcome,
        consumedNicotex: didConsume,
        notes: notes.trim() || undefined,
        durationSeconds: timerDurationSeconds - secondsRemaining
      };

      await db.cravings.put(cravingRecord);
      onCravingRecorded?.();

      if (didConsume) {
        onClose();
        // Prompt to log piece linked to this craving
        onOpenLogGum?.(cravingId);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to record craving outcome', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 1 ? "Identify Craving" :
        step === 2 ? "Pause & Intervene" : "Craving Outcome"
      }
    >
      <div className="space-y-5">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-7 h-1.5 rounded-full transition-all ${
                  step === i ? 'bg-cyan-400' : step > i ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Step {step} of 3
          </span>
        </div>

        {/* STEP 1: Identification */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                What triggered this urge right now?
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                {CRAVING_TRIGGERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrigger(t)}
                    className={`p-2.5 rounded-xl text-left text-xs transition-all border leading-tight ${
                      trigger === t
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold shadow-sm'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {trigger === 'Other' && (
                <input
                  type="text"
                  placeholder="Describe your trigger..."
                  value={customTrigger}
                  onChange={e => setCustomTrigger(e.target.value)}
                  className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              )}
            </div>

            {/* Intensity slider */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-300">Urge Intensity (1–10):</span>
                <span className="text-base font-extrabold text-amber-400">{initialIntensity}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={initialIntensity}
                onChange={e => setInitialIntensity(Number(e.target.value))}
                className="w-full accent-amber-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Mild urge</span>
                <span>Moderate</span>
                <span>Severe acute craving</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                setStep(2);
                startTimer(180); // start 3-minute pause by default
              }}
            >
              Start 3-Minute Pause <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Intervention Timer */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Countdown Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40">
              <div className="flex items-center space-x-2">
                <Timer size={18} className="text-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold text-cyan-200">Delay Pause</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black font-mono text-cyan-300">
                  {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
                </span>
                <button
                  onClick={() => startTimer(timerDurationSeconds === 120 ? 180 : 120)}
                  className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/60"
                >
                  {timerDurationSeconds === 120 ? 'Switch 3m' : 'Switch 2m'}
                </button>
              </div>
            </div>

            {/* Intervention Selector Chips */}
            <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
              {INTERVENTION_TYPES.map(inv => {
                const isSelected = selectedIntervention === inv.id;
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedIntervention(inv.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {inv.label}
                  </button>
                );
              })}
            </div>

            {/* Active Intervention Content */}
            <div className="rounded-2xl bg-slate-800/30 border border-slate-800 p-3 min-h-[200px] flex flex-col justify-center">
              {selectedIntervention === 'breathing' && (
                <BreathingExercise />
              )}

              {selectedIntervention === 'water' && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Droplets size={32} />
                  </div>
                  <h4 className="text-base font-bold text-slate-100">Drink a Full Glass of Water</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Sip slowly. Cold water stimulates the vagus nerve and mechanically satisfies the oral sensory receptor without nicotine.
                  </p>
                </div>
              )}

              {selectedIntervention === 'walk' && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Footprints size={32} />
                  </div>
                  <h4 className="text-base font-bold text-slate-100">Take a Short Walk or Stretch</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Physically change your position. Stand up, walk to another room or outdoors, and stretch your back and neck.
                  </p>
                </div>
              )}

              {selectedIntervention === 'activity' && (
                <div className="text-left p-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Shuffle size={16} className="text-sky-400" /> 5-4-3-2-1 Sensory Grounding
                  </h4>
                  <p className="text-xs text-slate-300">Name right now:</p>
                  <ul className="text-xs text-slate-400 space-y-1 pl-2">
                    <li>• <strong>5 things</strong> you can see around you</li>
                    <li>• <strong>4 things</strong> you can physically touch</li>
                    <li>• <strong>3 sounds</strong> you can hear</li>
                    <li>• <strong>2 scents</strong> you can smell</li>
                    <li>• <strong>1 positive thing</strong> you're grateful for</li>
                  </ul>
                </div>
              )}

              {selectedIntervention === 'surfing' && (
                <div className="text-left p-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Waves size={16} className="text-teal-400" /> Urge Surfing Technique
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Cravings are like ocean waves: they rise in intensity, peak, and naturally crash within 3–5 minutes.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Observe the tightness in your throat or restlessness in your hands as physical sensations that will pass, without fighting or obeying them.
                  </p>
                </div>
              )}

              {selectedIntervention === 'custom' && (
                <div className="text-center py-6 space-y-2">
                  <h4 className="text-sm font-bold text-slate-100">Personal Calming Strategy</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Chew regular sugar-free mint gum, listen to an upbeat song, or text a supportive friend.
                  </p>
                </div>
              )}
            </div>

            {/* Quick exit without penalty */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(3)}
              >
                Record Outcome
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={() => handleFinishOutcome(true)}
              >
                Chew Nicotex Now
              </Button>
            </div>
            <p className="text-[10px] text-center text-slate-500">
              Note: You can chew anytime without judgment. Pausing for even 60 seconds builds neurological resilience.
            </p>
          </div>
        )}

        {/* STEP 3: Outcome Recording */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                What happened after the pause?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'resisted' as const, label: 'Resisted Urge', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                  { id: 'postponed' as const, label: 'Postponed', icon: Clock, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
                  { id: 'consumed' as const, label: 'Chewed Gum', icon: XCircle, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = outcome === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOutcome(item.id)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center space-y-1.5 ${
                        isSelected
                          ? `${item.color} font-bold shadow-sm`
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post-Intervention Intensity */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-300">Current Intensity:</span>
                <span className="text-base font-extrabold text-cyan-400">{finalIntensity}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={finalIntensity}
                onChange={e => setFinalIntensity(Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 (Gone)</span>
                <span>Reduced</span>
                <span>Unchanged</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Reflections or what helped:
              </label>
              <input
                type="text"
                placeholder="E.g. drinking cold water took the edge off..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
              />
            </div>

            <Button
              variant="glow"
              size="lg"
              fullWidth
              disabled={isSaving}
              onClick={() => handleFinishOutcome(outcome === 'consumed')}
            >
              {isSaving ? 'Saving...' : 'Save Craving Record'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
