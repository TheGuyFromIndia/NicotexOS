import React from 'react';
import { LayoutDashboard, ShieldAlert, Target, BarChart3, Settings } from 'lucide-react';
import clsx from 'clsx';

export type TabType = 'dashboard' | 'cravings' | 'plan' | 'analytics' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Today', icon: LayoutDashboard },
    { id: 'cravings' as TabType, label: 'Cravings', icon: ShieldAlert },
    { id: 'plan' as TabType, label: 'Plan', icon: Target },
    { id: 'analytics' as TabType, label: 'Insights', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 pb-safe pt-2 px-3 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={clsx(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90",
                isActive
                  ? "text-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200 font-medium"
              )}
            >
              <div
                className={clsx(
                  "p-1.5 rounded-xl transition-all",
                  isActive && "bg-cyan-500/15 shadow-sm shadow-cyan-500/20"
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
