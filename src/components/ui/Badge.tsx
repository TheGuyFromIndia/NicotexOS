import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  className
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full border",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
