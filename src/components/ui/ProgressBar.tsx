import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  value: number; // current value
  max: number; // max value
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
  showLabels?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  variant = 'cyan',
  className,
  showLabels = false
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const barColors = {
    cyan: 'bg-cyan-500 shadow-sm shadow-cyan-500/50',
    emerald: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
    amber: 'bg-amber-500 shadow-sm shadow-amber-500/50',
    rose: 'bg-rose-500 shadow-sm shadow-rose-500/50'
  };

  return (
    <div className={clsx("w-full space-y-1.5", className)}>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColors[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
};
