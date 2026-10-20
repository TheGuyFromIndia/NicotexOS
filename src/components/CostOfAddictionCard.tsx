import React from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Truck,
  Package,
  Repeat,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { PurchaseRecord, ConsumptionEvent, AppSettings } from '../types';
import {
  formatINR,
  calculatePurchaseFinancials,
  calculateInventoryStatus
} from '../lib/calculations';

interface CostOfAddictionCardProps {
  purchases: PurchaseRecord[];
  consumptionEvents: ConsumptionEvent[];
  settings: AppSettings | null;
  onOpenPurchaseModal: () => void;
  onOpenInterruptionModal: () => void;
  onNavigateToSpending: () => void;
}

export const CostOfAddictionCard: React.FC<CostOfAddictionCardProps> = ({
  purchases,
  consumptionEvents,
  settings,
  onOpenPurchaseModal,
  onOpenInterruptionModal,
  onNavigateToSpending
}) => {
  const baselineMonthly = settings?.historicalMonthlySpendingEstimate || 3500;
  const openingStock = settings?.openingStockPieces || 0;

  const financials = calculatePurchaseFinancials(purchases, baselineMonthly);
  const inventory = calculateInventoryStatus(purchases, consumptionEvents, openingStock);

  // Avoided spending estimate (Potential savings = baseline monthly spending rate - actual spending rate)
  const monthlySavingsEstimate = Math.max(0, baselineMonthly - financials.estimatedMonthlySpending);

  return (
    <Card className="p-5 bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-950 border-rose-900/30 shadow-xl space-y-4">
      {/* Header & Title */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>The Cost of Nicotex</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">
            Financial Impact
          </h2>
        </div>

        <button
          onClick={onNavigateToSpending}
          className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all"
        >
          <span>Analytics</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Main Stat: Total Spent Since Tracking Began */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400 font-medium">Total Spent (Recorded Purchases):</span>
          <span className="text-3xl font-black font-mono text-slate-100 tracking-tight">
            {formatINR(financials.totalSpentAllTime)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Today</span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              {formatINR(financials.spentToday)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Last 7 Days</span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {formatINR(financials.spentLast7Days)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Last 30 Days</span>
            <span className="text-sm font-bold text-rose-300 font-mono">
              {formatINR(financials.spentLast30Days)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Projected Rate, Cost Per Piece, Delivery Fees, Repeat Buys */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Monthly & Annual Projection */}
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Projected Rate</span>
          <div className="text-base font-black font-mono text-slate-200">
            {formatINR(financials.estimatedMonthlySpending)}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            ~{formatINR(financials.estimatedAnnualSpending)}/year (estimate)
          </span>
        </div>

        {/* Cost per piece & Delivery fees */}
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-0.5">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Purchased Cost</span>
          <div className="text-base font-black font-mono text-cyan-300">
            ₹{financials.avgCostPerPiece}<span className="text-[10px] text-slate-400 font-normal">/pc</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Delivery paid: {formatINR(financials.totalDeliveryFees)}
          </span>
        </div>
      </div>

      {/* Repeat Purchases Callout (if any recorded) */}
      {financials.repeatPurchasesCount > 0 && (
        <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-amber-300">
            <Repeat size={15} />
            <span>Repeat Orders (&lt;24h):</span>
          </div>
          <span className="font-mono font-bold text-amber-200">
            {financials.repeatPurchasesCount} orders ({formatINR(financials.repeatPurchasesTotalSpent)})
          </span>
        </div>
      )}

      {/* Inventory Status Bar */}
      <div className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Package size={15} className="text-cyan-400" />
          <span>Estimated Gum Remaining:</span>
        </div>
        <div className="text-right">
          <strong className="text-slate-100 font-mono text-sm">
            {inventory.estimatedRemainingStock} pcs
          </strong>
          {inventory.isUncertain && (
            <span className="block text-[9px] text-amber-400 italic">estimate uncertain</span>
          )}
        </div>
      </div>

      {/* Action Buttons: Log Purchase & I'm About to Buy */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <Button
          variant="primary"
          size="md"
          onClick={onOpenPurchaseModal}
          className="flex items-center justify-center py-3 rounded-2xl text-xs font-extrabold shadow-cyan-500/20"
        >
          <ShoppingBag size={15} className="mr-1.5" />
          <span>Log a Purchase</span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={onOpenInterruptionModal}
          className="flex items-center justify-center py-3 rounded-2xl text-xs font-extrabold text-amber-300 border-amber-500/30 hover:bg-slate-800 active:border-amber-400"
        >
          <ShieldAlert size={15} className="mr-1.5 text-amber-400" />
          <span>I'm About to Buy</span>
        </Button>
      </div>
    </Card>
  );
};
