import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium transition-all active:scale-[0.97] select-none rounded-2xl touch-manipulation disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs h-9",
    md: "px-4 py-2.5 text-sm h-11",
    lg: "px-5 py-3.5 text-base h-13 font-semibold",
    xl: "px-6 py-4 text-lg h-16 font-bold shadow-lg"
  };

  const variantClasses = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-md shadow-cyan-500/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60",
    outline: "bg-transparent border border-slate-700 hover:bg-slate-800/60 text-slate-200",
    danger: "bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25",
    ghost: "bg-transparent hover:bg-slate-800/40 text-slate-300",
    glow: "bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 hover:opacity-95"
  };

  return (
    <button
      className={clsx(
        base,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
