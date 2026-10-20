import React, { useState, useEffect } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { Badge } from './ui/Badge';
import type { AppSettings, ReductionPlan } from '../types';

interface HeaderProps {
  settings: AppSettings | null;
  currentPlan: ReductionPlan | null;
  onOpenInstallModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentPlan,
  onOpenInstallModal
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentPhase = currentPlan?.phases[currentPlan.currentPhaseIndex || 0];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 pt-safe-top pb-3 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Status */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-cyan-400 font-black text-lg tracking-tighter">NX</span>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-slate-100">Nicotex</h1>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700/60">
                {settings?.strength || '2mg'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {currentPhase ? currentPhase.name.split(':')[0] : 'Personal Assistant'}
            </p>
          </div>
        </div>

        {/* Action badges */}
        <div className="flex items-center space-x-2">
          {!isOnline && (
            <Badge variant="amber" size="sm" className="flex items-center gap-1">
              <WifiOff size={11} /> Offline
            </Badge>
          )}

          <button
            onClick={onOpenInstallModal}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 active:scale-95 transition-all shadow-sm"
          >
            <Download size={13} className="text-cyan-400" />
            <span className="hidden xs:inline">Install</span>
          </button>
        </div>
      </div>
    </header>
  );
};
