import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Truck,
  Repeat,
  Package,
  Calendar,
  AlertTriangle,
  PieChart,
  ArrowRight,
  Filter,
  CheckCircle2,
  Edit2,
  Target,
  Heart,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { PurchaseRecord, ConsumptionEvent, AppSettings } from '../types';
import {
  formatINR,
  calculatePurchaseFinancials,
  calculateInventoryStatus
} from '../lib/calculations';

interface SpendingSavingsViewProps {
  purchases: PurchaseRecord[];
  consumptionEvents: ConsumptionEvent[];
  settings: AppSettings | null;
  onOpenPurchaseModal: (purchase?: PurchaseRecord) => void;
  onOpenInterruptionModal: () => void;
}

export const SpendingSavingsView: React.FC<SpendingSavingsViewProps> = ({
  purchases,
  consumptionEvents,
  settings,
  onOpenPurchaseModal,
  onOpenInterruptionModal
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'repeat'>('all');

  const baselineMonthly = settings?.historicalMonthlySpendingEstimate || 3500;
  const openingStock = settings?.openingStockPieces || 0;

  const financials = calculatePurchaseFinancials(purchases, baselineMonthly);
  const inventory = calculateInventoryStatus(purchases, consumptionEvents, openingStock);

  const sortedPurchases = [...purchases].sort((a, b) => b.timestamp - a.timestamp);
  const filteredPurchases = selectedFilter === 'repeat'
    ? sortedPurchases.filter(p => p.isRepeatPurchase)
    : sortedPurchases;

  // Average time between purchases
  let avgDaysBetweenPurchases: number | null = null;
  if (sortedPurchases.length >= 2) {
    const oldest = sortedPurchases[sortedPurchases.length - 1].timestamp;
    const newest = sortedPurchases[0].timestamp;
    const totalDays = (newest - oldest) / 86400000;
    avgDaysBetweenPurchases = Number((totalDays / (sortedPurchases.length - 1)).toFixed(1));
  }

  const deliveryFeePct = financials.totalSpentAllTime > 0
    ? Math.round((financials.totalDeliveryFees / financials.totalSpentAllTime) * 100)
    : 0;

  const avgSpentPerOrder = financials.purchaseCount > 0
    ? Math.round(financials.totalSpentAllTime / financials.purchaseCount)
    : 0;

  return (
    <div className="space-y-5 pb-28 max-w-md mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-100">Spending & Savings</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed purchase tracking, retailer costs, and projections.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => onOpenPurchaseModal()}
          className="text-xs"
        >
          + Add Purchase
        </Button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Spent</span>
          <div className="text-2xl font-black font-mono text-slate-100">
            {formatINR(financials.totalSpentAllTime)}
          </div>
          <span className="text-[10px] text-slate-500 block">
            Across {financials.purchaseCount} orders
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Per Order</span>
          <div className="text-2xl font-black font-mono text-cyan-300">
            {formatINR(avgSpentPerOrder)}
          </div>
          <span className="text-[10px] text-slate-500 block">
            ₹{financials.avgCostPerPiece} / piece
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Last 30 Days</span>
          <div className="text-2xl font-black font-mono text-rose-300">
            {formatINR(financials.spentLast30Days)}
          </div>
          <span className="text-[10px] text-slate-500 block">
            7-day: {formatINR(financials.spentLast7Days)}
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delivery Fees</span>
          <div className="text-2xl font-black font-mono text-amber-300">
            {formatINR(financials.totalDeliveryFees)}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {deliveryFeePct}% of total expenditure
          </span>
        </Card>
      </div>

      {/* Monthly Budget Tracker Card */}
      {settings?.monthlyNicotexBudgetLimit ? (
        (() => {
          const budget = settings.monthlyNicotexBudgetLimit;
          const spentMonth = financials.spentLast30Days;
          const isOver = spentMonth > budget;
          const pctUsed = Math.min(200, Math.round((spentMonth / budget) * 100));
          const diff = Math.abs(spentMonth - budget);

          return (
            <Card className="p-4 bg-slate-900 border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-300">
                  <Target size={15} className="text-cyan-400" />
                  <span>Monthly Nicotex Budget</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {formatINR(budget)} limit
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Used past 30 days:</span>
                  <span className={`font-mono font-bold ${isOver ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatINR(spentMonth)} ({pctUsed}%)
                  </span>
                </div>
                <ProgressBar
                  value={spentMonth}
                  max={budget}
                  variant={isOver ? 'amber' : 'cyan'}
                />
              </div>

              {/* Supportive, calm feedback */}
              <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                isOver
                  ? 'bg-amber-950/30 border border-amber-800/40 text-amber-200'
                  : pctUsed >= 80
                  ? 'bg-cyan-950/30 border border-cyan-800/40 text-cyan-200'
                  : 'bg-emerald-950/20 border border-emerald-800/30 text-emerald-300'
              }`}>
                {isOver ? (
                  <span>
                    You're <strong>{formatINR(diff)}</strong> above your monthly budget. What matters most is staying focused on your scheduled taper windows and taking a 5-minute pause before ordering again.
                  </span>
                ) : pctUsed >= 80 ? (
                  <span>
                    You're nearing your monthly limit (<strong>{formatINR(diff)}</strong> remaining). A short delay before buying your next pack can keep you right on target.
                  </span>
                ) : (
                  <span>
                    You are well within your monthly budget allowance (<strong>{formatINR(diff)}</strong> remaining). Keep pacing your doses!
                  </span>
                )}
              </div>
            </Card>
          );
        })()
      ) : null}

      {/* 12-Month Projections: Current vs Taper vs Complete Cessation */}
      <Card className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase">
          <TrendingUp size={15} />
          <span>12-Month Spending & Savings Scenarios</span>
        </div>

        <div className="space-y-2 pt-1">
          {/* Scenario 1: Continuing at current purchase pace */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-slate-300">1. At current purchase rate:</span>
              <span className="font-mono text-rose-300">{formatINR(financials.estimatedAnnualSpending)}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Continuing recent buying frequency without intervention.
            </p>
          </div>

          {/* Scenario 2: With Taper Plan (~50% reduction) */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-900/40 space-y-1 text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-cyan-300">2. Following taper reduction:</span>
              <span className="font-mono text-cyan-300">
                Save ~{formatINR(Math.round(financials.estimatedAnnualSpending * 0.5))}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Steadily spacing doses reduces annual spending to ~{formatINR(Math.round(financials.estimatedAnnualSpending * 0.5))}.
            </p>
          </div>

          {/* Scenario 3: Complete Cessation */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-1 text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-emerald-300">3. Quitting completely:</span>
              <span className="font-mono text-emerald-400">
                Save 100% ({formatINR(financials.estimatedAnnualSpending)})
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              Zero spending on Nicotex or delivery fees. All funds freed for your real priorities.
            </p>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 italic pt-1">
          * Based on recorded purchase velocity and baseline estimates; not a guaranteed outcome.
        </p>
      </Card>

      {/* Visual Comparison: What Your Projected Savings Could Buy / Fund */}
      <Card className="p-4 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 border-cyan-800/40 space-y-3">
        <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs uppercase">
          <Sparkles size={15} />
          <span>What Your Quitting Savings Could Fund</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Redirecting ~<strong>{formatINR(financials.estimatedAnnualSpending)}</strong> away from nicotine gum each year directly fuels your real goals:
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-cyan-400 block">Home / Personal EMIs</span>
            <span className="text-sm font-black font-mono text-slate-100">
              ~{Math.max(1, Math.round(financials.estimatedAnnualSpending / 20000))} Months
            </span>
            <span className="text-[10px] text-slate-400 block">of an EMI prepayment</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Travel & Vacation</span>
            <span className="text-sm font-black font-mono text-slate-100">
              1 Major Holiday
            </span>
            <span className="text-[10px] text-slate-400 block">or multiple weekend trips</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Mutual Funds / SIP</span>
            <span className="text-sm font-black font-mono text-slate-100">
              {formatINR(Math.round(financials.estimatedAnnualSpending / 12))}/mo
            </span>
            <span className="text-[10px] text-slate-400 block">invested in equity index</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-400 block">Gift for Loved Ones</span>
            <span className="text-sm font-black font-mono text-slate-100">
              Priceless
            </span>
            <span className="text-[10px] text-slate-400 block">gifts & meaningful experiences</span>
          </div>
        </div>
      </Card>

      {/* Inventory vs Consumption Reconciliation */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase">
            <Package size={15} />
            <span>Inventory Reconciliation</span>
          </div>
          <span className="text-sm font-black font-mono text-cyan-300">
            {inventory.estimatedRemainingStock} pcs remaining
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-0.5">
            <span className="text-[10px] text-slate-400 block">Pieces Purchased</span>
            <span className="text-base font-bold text-slate-100 font-mono">
              {inventory.totalPiecesPurchased} pcs
            </span>
            <span className="text-[10px] text-slate-500 block">
              Last 30d: {inventory.purchasedLast30Days} pcs
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-0.5">
            <span className="text-[10px] text-slate-400 block">Pieces Consumed</span>
            <span className="text-base font-bold text-slate-100 font-mono">
              {inventory.totalPiecesConsumed} pcs
            </span>
            <span className="text-[10px] text-slate-500 block">
              Last 30d: {inventory.consumedLast30Days} pcs
            </span>
          </div>
        </div>

        {inventory.isUncertain && (
          <p className="text-[10px] text-amber-400 italic">
            * Note: Inventory estimate is uncertain because consumption was logged with zero recorded opening stock or before purchases were logged. You can set opening stock in Settings.
          </p>
        )}
      </Card>

      {/* Retailer Breakdown */}
      {financials.spendingByRetailer.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs uppercase">
            <PieChart size={15} className="text-cyan-400" />
            <span>Spending by Service / Retailer</span>
          </div>

          <div className="space-y-2 pt-1">
            {financials.spendingByRetailer.map(item => (
              <div key={item.retailer} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-200 font-medium">{item.retailer}</span>
                  <span className="text-slate-400 font-mono">
                    {formatINR(item.total)} ({item.pct}%)
                  </span>
                </div>
                <ProgressBar
                  value={item.total}
                  max={financials.totalSpentAllTime}
                  variant="cyan"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Purchase History List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recorded Orders ({purchases.length})
          </h3>
          <div className="flex space-x-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${
                selectedFilter === 'all'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('repeat')}
              className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${
                selectedFilter === 'repeat'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Repeat ({financials.repeatPurchasesCount})
            </button>
          </div>
        </div>

        {filteredPurchases.length === 0 ? (
          <Card className="p-5 text-center text-xs text-slate-400 space-y-1">
            <p>No purchase records found.</p>
            <p className="text-[11px] text-slate-500">Tap "+ Add Purchase" above to log your orders.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredPurchases.map(p => {
              const d = new Date(p.timestamp);
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={p.id}
                  onClick={() => onOpenPurchaseModal(p)}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 space-y-1.5 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-100">{p.retailer}</span>
                      <span className="text-[11px] text-slate-500">{p.dateStr} at {timeStr}</span>
                    </div>
                    <span className="font-mono font-black text-slate-100">
                      {formatINR(p.totalPaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {p.packsCount * p.piecesPerPack} pcs ({p.strength}) • ₹{p.costPerPiece}/pc
                    </span>
                    {p.deliveryCharge > 0 && (
                      <span className="text-slate-500">Delivery: ₹{p.deliveryCharge}</span>
                    )}
                  </div>

                  {p.isRepeatPurchase && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-amber-300 pt-1 border-t border-slate-800/80">
                      <Repeat size={12} />
                      <span>Repeat purchase ({Math.round(p.repeatHoursSinceLast || 17)}h since last)</span>
                      {p.purchaseTrigger && <span>• "{p.purchaseTrigger}"</span>}
                    </div>
                  )}

                  {p.notes && (
                    <p className="text-[10px] text-slate-500 italic pt-0.5">
                      "{p.notes}"
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
