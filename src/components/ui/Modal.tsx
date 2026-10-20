import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'center';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      <div
        className={clsx(
          "relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col",
          position === 'bottom' 
            ? "rounded-t-[2.5rem] sm:rounded-[2.5rem] pb-safe" 
            : "rounded-[2.5rem]"
        )}
      >
        {/* iOS Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-700/60 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60">
          <h3 className="text-lg font-bold text-slate-100 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-full bg-slate-800/50 hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
