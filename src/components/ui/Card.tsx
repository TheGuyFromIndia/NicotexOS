import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  interactive = false,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "rounded-3xl p-5 border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl transition-all shadow-sm",
        interactive && "active:scale-[0.99] cursor-pointer hover:border-slate-700/80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
