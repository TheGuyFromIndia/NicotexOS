import React, { useState } from 'react';
import { AlertTriangle, Clock, Heart, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { PurchaseRecord, FinancialMotivation, PurchaseTrigger } from '../types';
import { db } from '../db';
import { formatINR, getRelevantMotivations } from '../lib/calculations';

interface RepeatPurchaseAlertCardProps {
  recentRepeatPurchase: PurchaseRecord;
  motivations: FinancialMotivation[];
  onAcknowledged: () => void;
}

export const RepeatPurchaseAlertCard: React.FC<RepeatPurchaseAlertCardProps> = ({
  recentRepeatPurchase,
  motivations,
  onAcknowledged
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(
    recentRepeatPurchase.purchaseTrigger || ''
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const roundedHours = Math.max(1, Math.round(recentRepeatPurchase.repeatHoursSinceLast || 17));
  const relevantMotivations = getRelevantMotivations(motivations, 2);

  const handleSelectReason = async (reason: string) => {
    setSelectedReason(reason);
    await db.purchases.update(recentRepeatPurchase.id, {
      purchaseTrigger: reason,
      acknowledgedRepeat: true
    });
    setIsSaved(true);
    setTimeout(() => {
      onAcknowledged();
    }, 1200);
  };

  const handleDismiss = async () => {
    await db.purchases.update(recentRepeatPurchase.id, {
      acknowledgedRepeat: true
    });
    onAcknowledged();
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/40 shadow-lg shadow-amber-950/20 space-y-3 animate-in fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <span>You bought Nicotex twice in about {roundedHours} hours</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-200"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <>
          <p className="text-xs text-slate-300 leading-relaxed">
            You made another purchase soon after your previous order. Was this driven by stress, a difficult day, or running out sooner than expected?
          </p>

          {/* Personal Motivations Reminder */}
          {relevantMotivations.length > 0 && (
            <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-1 text-xs text-cyan-200">
              <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
                <Heart size={13} />
                <span>Remember why you're doing this:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Reducing expenses, staying ahead of your EMIs, having more money for travel & investments, and quitting for yourself and the people you care about.
              </p>
            </div>
          )}

          {/* Trigger Question */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Record what happened to identify future patterns:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'I was stressed',
                'I was running out',
                'I bought it out of habit',
                'I want to pause before buying again',
                'Other reason'
              ].map(reason => {
                const isSelected = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleSelectReason(reason)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            {isSaved ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} /> Recorded trigger!
              </span>
            ) : (
              <span className="text-slate-500 text-[10px]">Pattern analysis saved locally</span>
            )}
            <button
              onClick={handleDismiss}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </Card>
  );
};
