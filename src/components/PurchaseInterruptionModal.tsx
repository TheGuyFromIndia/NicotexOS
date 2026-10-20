import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Clock,
  DollarSign,
  Droplets,
  Wind,
  Footprints,
  Heart,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowRight
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type {
  PurchaseRecord,
  PurchaseUrgeEvent,
  FinancialMotivation,
  AppSettings
} from '../types';
import { db, getLocalDateString } from '../db';
import { formatINR, calculatePurchaseFinancials, getRelevantMotivations } from '../lib/calculations';

interface PurchaseInterruptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseRecord[];
  settings: AppSettings | null;
  estimatedRemainingPieces: number;
  onOpenPurchaseModal: () => void;
  onUrgeLogged?: () => void;
}

export const PurchaseInterruptionModal: React.FC<PurchaseInterruptionModalProps> = ({
  isOpen,
  onClose,
  purchases,
  settings,
  estimatedRemainingPieces,
  onOpenPurchaseModal,
  onUrgeLogged
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [trigger, setTrigger] = useState<string>('I feel stressed or anxious');
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [pauseDurationMinutes, setPauseDurationMinutes] = useState<number>(5);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<'resisted' | 'delayed' | 'purchased' | 'still_want_to_buy'>('resisted');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const startTimestampRef = useRef<number | null>(null);

  const financials = calculatePurchaseFinancials(purchases, settings?.historicalMonthlySpendingEstimate || 3500);
  const motivations = getRelevantMotivations(settings?.financialMotivations || [], 2);

  // Find most recent purchase
  const sortedPurchases = [...purchases].sort((a, b) => b.timestamp - a.timestamp);
  const lastPurchase = sortedPurchases[0] || null;

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTrigger('I feel stressed or anxious');
      setCustomTrigger('');
      setPauseDurationMinutes(5);
      setSecondsRemaining(300);
      setTimerActive(false);
      startTimestampRef.current = null;
      setOutcome('resisted');
      setNotes('');
    }
  }, [isOpen]);

  // Backgrounding safe countdown timer
  useEffect(() => {
    if (!timerActive || step !== 3) return;

    if (!startTimestampRef.current) {
      startTimestampRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (startTimestampRef.current || now)) / 1000);
      const remaining = Math.max(0, pauseDurationMinutes * 60 - elapsed);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        setTimerActive(false);
        setStep(4);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timerActive, step, pauseDurationMinutes]);

  const handleStartPause = (mins: number) => {
    setPauseDurationMinutes(mins);
    setSecondsRemaining(mins * 60);
    startTimestampRef.current = Date.now();
    setTimerActive(true);
    setStep(3);
  };

  const handleFinish = async (selectedOutcome: typeof outcome) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const todayStr = getLocalDateString();
      const typicalPackPrice = settings?.packPrice || 228;

      const urgeRecord: PurchaseUrgeEvent = {
        id: `urge_${Date.now()}`,
        timestamp: Date.now(),
        dateStr: todayStr,
        trigger: trigger === 'Other' && customTrigger ? customTrigger : trigger,
        pauseDurationMinutes,
        outcome: selectedOutcome,
        estimatedCostAvoided: selectedOutcome === 'resisted' ? typicalPackPrice : undefined,
        notes: notes.trim() || undefined
      };

      await db.purchaseUrges.put(urgeRecord);
      onUrgeLogged?.();
      onClose();

      if (selectedOutcome === 'purchased' || selectedOutcome === 'still_want_to_buy') {
        onOpenPurchaseModal();
      }
    } catch (err) {
      console.error('Failed to save purchase urge', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 1 ? "Pause Before Buying" :
        step === 2 ? "Spending Reality Check" :
        step === 3 ? "Deliberate Pause Timer" : "Decision Reflection"
      }
    >
      <div className="space-y-4">
        {/* Step tracker indicator */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`w-6 h-1 rounded-full transition-all ${
                  step === i ? 'bg-amber-400' : step > i ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Step {step} of 4
          </span>
        </div>

        {/* STEP 1: What triggered the urge to buy */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                What triggered the urge to open the app and order right now?
              </label>
              <div className="space-y-1.5">
                {[
                  'I feel stressed or anxious',
                  'I am running out of gum',
                  'Automatic urge or routine habit',
                  'Difficult work pressure / deadline',
                  'Boredom or procrastination',
                  'Saw a delivery discount / flash deal',
                  'Other'
                ].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrigger(t)}
                    className={`w-full py-2.5 px-3 rounded-xl text-left text-xs transition-all border ${
                      trigger === t
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {trigger === 'Other' && (
                <input
                  type="text"
                  placeholder="Describe what triggered you..."
                  value={customTrigger}
                  onChange={e => setCustomTrigger(e.target.value)}
                  className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setStep(2)}
            >
              Continue to Reality Check <ArrowRight size={15} className="ml-1.5" />
            </Button>
          </div>
        )}

        {/* STEP 2: Spending Reality Check & Inventory */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-2.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                Your Recent Nicotex Spending:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Last 7 Days</span>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    {formatINR(financials.spentLast7Days)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Last 30 Days</span>
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {formatINR(financials.spentLast30Days)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">This Month</span>
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {formatINR(financials.spentCurrentMonth)}
                  </span>
                </div>
              </div>

              {/* Remaining inventory info */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-300">
                <span>Estimated stock remaining:</span>
                <span className="font-bold text-cyan-400 font-mono">
                  ~{estimatedRemainingPieces} pieces
                </span>
              </div>

              {lastPurchase && (
                <p className="text-[11px] text-slate-400 italic">
                  Last ordered: {lastPurchase.retailer} ({formatINR(lastPurchase.totalPaid)} for {lastPurchase.packsCount * lastPurchase.piecesPerPack} pcs) on {lastPurchase.dateStr}.
                </p>
              )}
            </div>

            {/* Personal Motivations Highlight */}
            {motivations.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5 text-xs text-cyan-200">
                <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
                  <Heart size={14} />
                  <span>Why You Want to Quit:</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                  {motivations.map(m => (
                    <li key={m.id}>• {m.title}{m.targetAmount ? ` (Target: ${formatINR(m.targetAmount)})` : ''}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-slate-300 block text-center">
                Take a short pause before placing the order:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleStartPause(5)}
                >
                  <Timer size={16} className="mr-1.5" /> 5-Min Pause
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartPause(10)}
                >
                  <Timer size={16} className="mr-1.5" /> 10-Min Pause
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setStep(4)}
                className="text-xs text-slate-400"
              >
                Skip pause and proceed directly
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Pause Countdown Timer */}
        {step === 3 && (
          <div className="space-y-4 text-center py-2">
            <div className="w-24 h-24 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex flex-col items-center justify-center shadow-lg shadow-amber-500/10 animate-pulse">
              <span className="text-2xl font-black font-mono text-amber-300">
                {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Pause</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2 text-xs text-slate-300 text-left">
              <span className="font-bold text-slate-200 block">While you pause:</span>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-center gap-1.5">
                  <Droplets size={13} className="text-cyan-400 shrink-0" />
                  <span>Sip a full glass of cold water slowly.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Footprints size={13} className="text-emerald-400 shrink-0" />
                  <span>Put your phone down and walk to another room or stretch.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Wind size={13} className="text-sky-400 shrink-0" />
                  <span>Take 5 slow breaths (4s inhale, 7s hold, 8s exhale).</span>
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setStep(4)}
            >
              Done Pausing (Record Outcome)
            </Button>
          </div>
        )}

        {/* STEP 4: Outcome Selection */}
        {step === 4 && (
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-300 block">
              What did you decide?
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOutcome('resisted')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  outcome === 'resisted'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs mb-1">
                  <CheckCircle2 size={16} />
                  <span>Resisted Urge</span>
                </div>
                <p className="text-[10px] text-slate-400">Decided not to place an order right now.</p>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('delayed')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  outcome === 'delayed'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-xs mb-1">
                  <Clock size={16} />
                  <span>Delayed Order</span>
                </div>
                <p className="text-[10px] text-slate-400">Waiting until inventory actually runs out.</p>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('purchased')}
                className={`p-3 rounded-2xl border text-left transition-all col-span-2 ${
                  outcome === 'purchased' || outcome === 'still_want_to_buy'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs mb-1">
                  <ShoppingBag size={16} />
                  <span>Placed / Still Placing Order</span>
                </div>
                <p className="text-[10px] text-slate-400">Proceed to record the purchase amount without judgment.</p>
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Notes (optional)</label>
              <input
                type="text"
                placeholder="What helped you pause or decide?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500"
              />
            </div>

            <Button
              variant="glow"
              size="md"
              fullWidth
              disabled={isSaving}
              onClick={() => handleFinish(outcome)}
            >
              {isSaving ? 'Saving...' : outcome === 'resisted' ? 'Save & Record Avoided Spend' : 'Continue to Purchase Log'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
