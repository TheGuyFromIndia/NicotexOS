import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  Bell,
  ShieldAlert,
  Smartphone,
  Save,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Sunrise,
  Clock,
  Heart,
  Plus,
  IndianRupee,
  Package,
  Target
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { AppSettings, NicotexStrength, ScheduleMode, FinancialMotivation } from '../types';
import {
  updateSettings,
  exportDatabaseToJSON,
  exportConsumptionToCSV,
  exportCravingsToCSV,
  exportPurchasesToCSV,
  importDatabaseFromJSON,
  clearAllDatabaseData
} from '../db';
import { formatINR } from '../lib/calculations';

interface SettingsViewProps {
  settings: AppSettings | null;
  onSettingsUpdated: () => void;
  onOpenInstallGuide: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  onOpenInstallGuide
}) => {
  // Local edit states
  const [strength, setStrength] = useState<NicotexStrength>(settings?.strength || '2mg');
  const [packPrice, setPackPrice] = useState<number>(settings?.packPrice || 115);
  const [packQuantity, setPackQuantity] = useState<number>(settings?.packQuantity || 9);
  const [currency, setCurrency] = useState<string>(settings?.currency || '₹');
  const [baselinePieces, setBaselinePieces] = useState<number>(settings?.baselinePiecesPerDay || 8);
  const [wakeTime, setWakeTime] = useState<string>(settings?.wakeTime || '07:30');
  const [sleepTime, setSleepTime] = useState<string>(settings?.sleepTime || '23:30');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(settings?.scheduleMode || 'actual_wake');
  const [firstDoseDelayMinutes, setFirstDoseDelayMinutes] = useState<number>(settings?.firstDoseDelayMinutes || 30);
  const [minSpacingMinutes, setMinSpacingMinutes] = useState<number>(settings?.minSpacingMinutes || 90);

  // Financial & Inventory settings
  const [openingStockPieces, setOpeningStockPieces] = useState<number>(settings?.openingStockPieces ?? 0);
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<number>(settings?.monthlyNicotexBudgetLimit ?? 3000);
  const [historicalMonthlyEstimate, setHistoricalMonthlyEstimate] = useState<number>(
    settings?.historicalMonthlySpendingEstimate ?? 3500
  );
  const [motivations, setMotivations] = useState<FinancialMotivation[]>(
    settings?.financialMotivations || [
      { id: 'mot_emi', category: 'emi', title: 'Staying ahead of monthly EMI commitments', targetAmount: 25000, enabled: true },
      { id: 'mot_travel', category: 'travel', title: 'Building a travel & vacation fund', targetAmount: 50000, enabled: true },
      { id: 'mot_invest', category: 'investment', title: 'Investing in long-term wealth & mutual funds', targetAmount: 15000, enabled: true },
      { id: 'mot_loved_ones', category: 'relationships', title: 'Being fully present for myself and loved ones', enabled: true },
      { id: 'mot_health', category: 'health', title: 'Freedom from chemical oral dependence & anxiety', enabled: true }
    ]
  );
  const [newMotivationTitle, setNewMotivationTitle] = useState<string>('');
  const [newMotivationTarget, setNewMotivationTarget] = useState<string>('');
  const [isAddingMotivation, setIsAddingMotivation] = useState<boolean>(false);

  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Notifications
  const [notificationStatus, setNotificationStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Restore & Wipe confirmation modals
  const [isWipeModalOpen, setIsWipeModalOpen] = useState<boolean>(false);
  const [wipeConfirmText, setWipeConfirmText] = useState<string>('');
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSaveSettings = async () => {
    await updateSettings({
      strength,
      packPrice: Number(packPrice),
      packQuantity: Number(packQuantity),
      currency,
      baselinePiecesPerDay: Number(baselinePieces),
      wakeTime,
      sleepTime,
      scheduleMode,
      firstDoseDelayMinutes: Number(firstDoseDelayMinutes),
      minSpacingMinutes: Number(minSpacingMinutes),
      openingStockPieces: Number(openingStockPieces),
      monthlyNicotexBudgetLimit: Number(monthlyBudgetLimit) > 0 ? Number(monthlyBudgetLimit) : undefined,
      historicalMonthlySpendingEstimate: Number(historicalMonthlyEstimate),
      financialMotivations: motivations
    });
    setIsSaved(true);
    onSettingsUpdated();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleMotivation = (id: string) => {
    setMotivations(prev =>
      prev.map(m => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleUpdateMotivationTarget = (id: string, target?: number) => {
    setMotivations(prev =>
      prev.map(m => (m.id === id ? { ...m, targetAmount: target } : m))
    );
  };

  const handleDeleteMotivation = (id: string) => {
    setMotivations(prev => prev.filter(m => m.id !== id));
  };

  const handleAddCustomMotivation = () => {
    if (!newMotivationTitle.trim()) return;
    const newMot: FinancialMotivation = {
      id: `mot_custom_${Date.now()}`,
      category: 'other',
      title: newMotivationTitle.trim(),
      targetAmount: Number(newMotivationTarget) > 0 ? Number(newMotivationTarget) : undefined,
      enabled: true
    };
    setMotivations(prev => [...prev, newMot]);
    setNewMotivationTitle('');
    setNewMotivationTarget('');
    setIsAddingMotivation(false);
  };

  const handleExportJSON = async () => {
    const jsonStr = await exportDatabaseToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nicotex_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportConsumptionCSV = async () => {
    const csvStr = await exportConsumptionToCSV();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nicotex_Consumption_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCravingsCSV = async () => {
    const csvStr = await exportCravingsToCSV();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nicotex_Cravings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPurchasesCSV = async () => {
    const csvStr = await exportPurchasesToCSV();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nicotex_Purchases_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importDatabaseFromJSON(text);
      if (res.success) {
        setRestoreMessage({ text: res.message });
        onSettingsUpdated();
      } else {
        setRestoreMessage({ text: res.message, error: true });
      }
    } catch (err) {
      setRestoreMessage({ text: 'Error reading JSON backup file.', error: true });
    }
  };

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser environment.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
    if (permission === 'granted') {
      new Notification('Nicotex Active', {
        body: 'Local notifications enabled on this device.',
        icon: '/icons/icon-192x192.png'
      });
    }
  };

  const handleConfirmWipe = async () => {
    if (wipeConfirmText.toLowerCase() === 'delete') {
      await clearAllDatabaseData();
      setIsWipeModalOpen(false);
      onSettingsUpdated();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-5 pb-28 max-w-md mx-auto px-4 pt-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-extrabold text-slate-100">Settings & Data Management</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Local device configuration, export/restore, and privacy controls.
        </p>
      </div>

      {/* Storage and Privacy Warning */}
      <div className="p-4 rounded-3xl bg-amber-950/25 border border-amber-800/40 space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-amber-300 font-bold">
          <ShieldAlert size={16} />
          <span>Local Storage & Data Persistence</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          All application records are stored exclusively inside your browser's local IndexedDB. <strong>Hosting this app on the web does NOT automatically sync or back up your data to any cloud.</strong>
        </p>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Browser cache clearing, iOS storage pressure, private browsing mode, or deleting the Home Screen app may erase local records. We strongly recommend downloading a periodic JSON backup below.
        </p>
      </div>

      {/* Schedule & Wake-Up Routine Configuration */}
      <Card className="space-y-4">
        <div className="flex items-center space-x-2">
          <Sunrise size={16} className="text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Wake-Up Routine & Schedule Timing
          </h3>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Schedule Generation Mode:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScheduleMode('actual_wake')}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all leading-tight ${
                scheduleMode === 'actual_wake'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <span className="block font-bold">Actual Wake-Up</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Calculates from "I just woke up" tap</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('fixed_clock')}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all leading-tight ${
                scheduleMode === 'fixed_clock'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <span className="block font-bold">Fixed Clock Time</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Uses static configured waking time</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Delay before 1st dose
            </label>
            <select
              value={firstDoseDelayMinutes}
              onChange={e => setFirstDoseDelayMinutes(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
              <option value={90}>90 Minutes</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Minimum Spacing Buffer
            </label>
            <select
              value={minSpacingMinutes}
              onChange={e => setMinSpacingMinutes(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              <option value={60}>60 Minutes (1h)</option>
              <option value={90}>90 Minutes (1.5h)</option>
              <option value={120}>120 Minutes (2h)</option>
              <option value={150}>150 Minutes (2.5h)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Usual Wake Time</label>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Usual Sleep Time</label>
            <input
              type="time"
              value={sleepTime}
              onChange={e => setSleepTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>
        </div>
      </Card>

      {/* Product & Pack Parameters */}
      <Card className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Product & Pack Parameters
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nicotex Strength</label>
            <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700/80">
              {(['2mg', '4mg'] as NicotexStrength[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrength(s)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    strength === s
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Currency Symbol</label>
            <input
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 text-center font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Pack Price</label>
            <input
              type="number"
              min="1"
              value={packPrice}
              onChange={e => setPackPrice(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Pieces / Pack</label>
            <input
              type="number"
              min="1"
              value={packQuantity}
              onChange={e => setPackQuantity(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Baseline Pieces Per Day (Reference)
          </label>
          <input
            type="number"
            min="1"
            value={baselinePieces}
            onChange={e => setBaselinePieces(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
          />
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={handleSaveSettings}
        >
          {isSaved ? (
            <>
              <Check size={16} className="mr-1.5" /> Saved Settings
            </>
          ) : (
            <>
              <Save size={16} className="mr-1.5" /> Save Changes
            </>
          )}
        </Button>
      </Card>

      {/* Why I'm Quitting: Financial & Personal Motivations */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart size={16} className="text-rose-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Why I'm Quitting: Motivations
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingMotivation(!isAddingMotivation)}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <Plus size={13} />
            <span>Add Goal</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          These reasons remind you what your money can achieve when you pause before buying or reach for another pack.
        </p>

        {/* List of motivations */}
        <div className="space-y-2 pt-1">
          {motivations.map(m => (
            <div
              key={m.id}
              className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                m.enabled
                  ? 'bg-slate-900 border-slate-700/80 text-slate-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex-1 pr-2">{m.title}</span>
                <button
                  type="button"
                  onClick={() => handleToggleMotivation(m.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                    m.enabled
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {m.enabled ? 'Active' : 'Paused'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1 text-slate-400">
                  <span>Target fund:</span>
                  <input
                    type="number"
                    value={m.targetAmount || ''}
                    placeholder="Optional ₹"
                    onChange={e => handleUpdateMotivationTarget(m.id, Number(e.target.value) || undefined)}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                {m.category === 'other' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMotivation(m.id)}
                    className="text-slate-500 hover:text-rose-400 text-[10px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add custom motivation form */}
        {isAddingMotivation && (
          <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-800/60 space-y-2.5 animate-in fade-in text-xs">
            <span className="text-[11px] font-bold text-cyan-300 block">Add New Personal Motivation</span>
            <input
              type="text"
              placeholder="e.g. Gift for parents, clearing credit card, trek in Ladakh"
              value={newMotivationTitle}
              onChange={e => setNewMotivationTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Target Amount ₹ (optional)"
                value={newMotivationTarget}
                onChange={e => setNewMotivationTarget(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
              />
              <Button size="sm" variant="primary" onClick={handleAddCustomMotivation}>
                Add
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Nicotex Budget & Inventory Defaults */}
      <Card className="space-y-4">
        <div className="flex items-center space-x-2">
          <Target size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Nicotex Budget & Inventory Settings
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Monthly Nicotex Budget Limit (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 3000"
              value={monthlyBudgetLimit || ''}
              onChange={e => setMonthlyBudgetLimit(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Displays spending warnings in a supportive, non-judgmental way.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Historical Monthly Spending Baseline (₹)
            </label>
            <input
              type="number"
              min="0"
              value={historicalMonthlyEstimate}
              onChange={e => setHistoricalMonthlyEstimate(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
            <span className="text-[10px] text-amber-400/90 mt-1 block">
              * Used as an estimated reference baseline before you started logging purchases.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Opening Stock (Pieces in hand when you started)
            </label>
            <input
              type="number"
              min="0"
              value={openingStockPieces}
              onChange={e => setOpeningStockPieces(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Used to calculate remaining gum inventory accurately (Purchased + Opening - Consumed).
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={handleSaveSettings}
        >
          {isSaved ? (
            <>
              <Check size={16} className="mr-1.5" /> Saved Budget & Defaults
            </>
          ) : (
            <>
              <Save size={16} className="mr-1.5" /> Save Budget & Defaults
            </>
          )}
        </Button>
      </Card>

      {/* Backup, Restore & CSV Export Card */}
      <Card className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Data Export & Restore
        </h3>

        <div className="space-y-2">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleExportJSON}
            className="justify-start text-xs"
          >
            <FileCode size={16} className="mr-2 text-cyan-400" />
            Download Complete Backup (.JSON)
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportConsumptionCSV}
              className="text-xs justify-start"
            >
              <FileSpreadsheet size={14} className="mr-1 text-emerald-400" />
              Pieces CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCravingsCSV}
              className="text-xs justify-start"
            >
              <FileSpreadsheet size={14} className="mr-1 text-amber-400" />
              Cravings CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPurchasesCSV}
              className="text-xs justify-start"
            >
              <FileSpreadsheet size={14} className="mr-1 text-cyan-400" />
              Purchases CSV
            </Button>
          </div>
        </div>

        {/* Restore from JSON */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Restore Records from JSON Backup:
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          {restoreMessage && (
            <p className={`text-xs ${restoreMessage.error ? 'text-rose-400' : 'text-emerald-400'}`}>
              {restoreMessage.text}
            </p>
          )}
        </div>
      </Card>

      {/* iPhone 17 & Notifications */}
      <Card className="space-y-3">
        <div className="flex items-center space-x-2">
          <Smartphone size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            iPhone 17 & Notifications
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          On iOS 16.4+, web notifications require adding Nicotex to your Home Screen first via Safari's Share menu.
        </p>

        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenInstallGuide}
            className="text-xs"
          >
            Safari Install Guide
          </Button>

          <Button
            size="sm"
            variant={notificationStatus === 'granted' ? 'secondary' : 'primary'}
            onClick={handleRequestNotifications}
            disabled={notificationStatus === 'granted'}
            className="text-xs"
          >
            <Bell size={14} className="mr-1.5" />
            {notificationStatus === 'granted' ? 'Notifications Active' : 'Enable Notifications'}
          </Button>
        </div>
      </Card>

      {/* Danger Zone: Erase All Data */}
      <Card className="border-rose-900/40 bg-rose-950/10 space-y-3">
        <div className="flex items-center space-x-2 text-rose-400">
          <AlertTriangle size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
        </div>
        <p className="text-xs text-slate-400">
          Permanently clear all consumption records, craving events, dose windows, and reduction plans from this device.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsWipeModalOpen(true)}
        >
          <Trash2 size={14} className="mr-1.5" /> Erase All Application Data
        </Button>
      </Card>

      {/* Version Indicator */}
      <div className="text-center text-[11px] text-slate-600 space-y-1">
        <p>Nicotex OS • Version 2.0.0 (Persistent Dose Timers & Routine)</p>
        <p>Client-side IndexedDB • Zero Cloud Telemetry</p>
      </div>

      {/* Erase Confirmation Modal */}
      <Modal
        isOpen={isWipeModalOpen}
        onClose={() => setIsWipeModalOpen(false)}
        title="Confirm Data Erasure"
      >
        <div className="space-y-4">
          <p className="text-xs text-rose-300 leading-relaxed">
            This action will irreversibly delete all your Nicotex gum logs, cravings, reduction plans, and streak history from this device.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Type <span className="font-mono text-rose-400">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={wipeConfirmText}
              onChange={e => setWipeConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsWipeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              disabled={wipeConfirmText.toLowerCase() !== 'delete'}
              onClick={handleConfirmWipe}
            >
              Permanently Erase
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
