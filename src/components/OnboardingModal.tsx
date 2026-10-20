import React, { useState } from 'react';
import { Shield, Sparkles, Clock, DollarSign, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import type { AppSettings, NicotexStrength, StoppingTimeline } from '../types';
import { updateSettings } from '../db';
import { generateReductionPlan } from '../lib/calculations';
import { db } from '../db';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<number>(1);

  // Form states
  const [strength, setStrength] = useState<NicotexStrength>('2mg');
  const [baselinePieces, setBaselinePieces] = useState<number>(8);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(120);
  const [timeAfterWaking, setTimeAfterWaking] = useState<number>(30);
  const [otherProducts, setOtherProducts] = useState<string>('None');
  const [previousAttempts, setPreviousAttempts] = useState<string>('Tried cold turkey or unassisted reduction.');
  const [timeline, setTimeline] = useState<StoppingTimeline>('8weeks');
  const [packPrice, setPackPrice] = useState<number>(115);
  const [packQuantity, setPackQuantity] = useState<number>(9);
  const [currency, setCurrency] = useState<string>('₹');
  const [wakeTime, setWakeTime] = useState<string>('07:30');
  const [sleepTime, setSleepTime] = useState<string>('23:30');
  const [observationDays, setObservationDays] = useState<number>(5);

  if (!isOpen) return null;

  const handleFinish = async () => {
    const updatedSettings: Partial<AppSettings> = {
      strength,
      baselinePiecesPerDay: Number(baselinePieces),
      baselineIntervalMinutes: Number(intervalMinutes),
      timeAfterWakingMinutes: Number(timeAfterWaking),
      otherNicotineProducts: otherProducts === 'None' ? [] : [otherProducts],
      previousAttempts,
      preferredTimeline: timeline,
      packPrice: Number(packPrice),
      packQuantity: Number(packQuantity),
      currency,
      wakeTime,
      sleepTime,
      baselineObservationDays: Number(observationDays),
      onboardingCompleted: true
    };

    const saved = await updateSettings(updatedSettings);

    // Generate initial personalized plan
    const initialPlan = generateReductionPlan(saved);
    await db.plans.put(initialPlan);
    await updateSettings({ currentPlanId: initialPlan.id });

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
              {step}/4
            </div>
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Personal Baseline Assessment
            </span>
          </div>
          <span className="text-xs text-cyan-400 font-medium">100% Private & Local</span>
        </div>

        {/* Step 1: Strength & Current Consumption */}
        {step === 1 && (
          <div className="py-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Which Nicotex gum do you use?</h2>
              <p className="text-xs text-slate-400">
                You've used Nicotex for 2–3 years. We'll start by mapping your current baseline without judgment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['2mg', '4mg'] as NicotexStrength[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrength(s)}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    strength === s
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-2xl font-black">{s}</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {s === '2mg' ? 'Standard dose' : 'Higher strength'}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-semibold text-slate-200 block">
                Estimated pieces consumed per day: <span className="text-cyan-400 font-bold">{baselinePieces}</span>
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={baselinePieces}
                onChange={e => setBaselinePieces(Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>1 piece</span>
                <span>15 pieces</span>
                <span>30 pieces</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-200 block">
                Typical interval between pieces:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1 hour', min: 60 },
                  { label: '2 hours', min: 120 },
                  { label: '3+ hours', min: 180 },
                ].map(item => (
                  <button
                    key={item.min}
                    type="button"
                    onClick={() => setIntervalMinutes(item.min)}
                    className={`py-2 px-3 text-xs rounded-xl border text-center transition-all ${
                      intervalMinutes === item.min
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Cues & Routine */}
        {step === 2 && (
          <div className="py-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Daily timing & routines</h2>
              <p className="text-xs text-slate-400">
                Identifying morning triggers helps intercept automatic reaching.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-200 block">
                How soon after waking do you chew your first piece?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Within 15m', val: 15 },
                  { label: '30–60m', val: 45 },
                  { label: 'After 1–2h', val: 90 },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setTimeAfterWaking(item.val)}
                    className={`py-2.5 px-3 text-xs rounded-xl border text-center transition-all ${
                      timeAfterWaking === item.val
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Usual Wake Time
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Usual Sleep Time
                </label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={e => setSleepTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Do you also use any other nicotine products?
              </label>
              <select
                value={otherProducts}
                onChange={e => setOtherProducts(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="None">No, Nicotex gum only</option>
                <option value="Vapes / E-cigarettes">Occasionally vape</option>
                <option value="Cigarettes">Occasionally smoke cigarettes</option>
                <option value="Other">Other nicotine pouches / products</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Cost & Pack Configuration */}
        {step === 3 && (
          <div className="py-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Pack pricing & currency</h2>
              <p className="text-xs text-slate-400">
                Helps calculate exact spending and estimated avoided expenses over time.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="₹">₹ (INR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Pack Price</label>
                <input
                  type="number"
                  min="1"
                  value={packPrice}
                  onChange={e => setPackPrice(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Gums / Pack</label>
                <input
                  type="number"
                  min="1"
                  value={packQuantity}
                  onChange={e => setPackQuantity(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-1">
              <div className="flex justify-between items-center text-xs text-cyan-300 font-semibold">
                <span>Calculated cost per piece:</span>
                <span className="text-sm font-bold text-cyan-200">
                  {currency}{(packPrice / (packQuantity || 1)).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                At {baselinePieces} pieces/day, your baseline spending is approximately {currency}
                {((baselinePieces * packPrice) / (packQuantity || 1)).toFixed(0)}/day (~{currency}
                {((baselinePieces * packPrice * 30) / (packQuantity || 1)).toFixed(0)}/month).
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Plan Strategy & Baseline Observation */}
        {step === 4 && (
          <div className="py-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Recommended starting approach</h2>
              <p className="text-xs text-slate-400">
                To build a sustainable reduction that prevents relapse, we begin with a baseline monitoring period.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>Phase 0: Baseline Observation ({observationDays} days)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chew as you normally would without pressure. Tap "Log Nicotex" whenever you chew, and tap "I'm craving" when urges strike. This provides genuine data before making gradual adjustments.
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Observation Period:</span>
                <select
                  value={observationDays}
                  onChange={e => setObservationDays(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
                >
                  <option value={3}>3 Days</option>
                  <option value={5}>5 Days (Recommended)</option>
                  <option value={7}>7 Days</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Preferred overall reduction timeline:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '8weeks' as StoppingTimeline, label: '8 Weeks (Balanced)' },
                  { id: '12weeks' as StoppingTimeline, label: '12 Weeks (Gradual)' },
                  { id: '4weeks' as StoppingTimeline, label: '4 Weeks (Fast)' },
                  { id: 'flexible' as StoppingTimeline, label: 'Flexible / Self-Paced' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeline(t.id)}
                    className={`py-2 px-3 text-xs rounded-xl border text-center transition-all ${
                      timeline === t.id
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(s => s - 1)}
            >
              <ArrowLeft size={16} className="mr-1.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setStep(s => s + 1)}
            >
              Continue <ArrowRight size={16} className="ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="glow"
              size="md"
              onClick={handleFinish}
            >
              Start My Assistant <Sparkles size={16} className="ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
