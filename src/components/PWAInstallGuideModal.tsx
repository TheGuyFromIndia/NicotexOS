import React from 'react';
import { Share, PlusSquare, Smartphone, WifiOff, Bell, ShieldCheck } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install on iPhone 17 (Safari)"
    >
      <div className="space-y-6">
        <p className="text-xs text-slate-300 leading-relaxed">
          Install Nicotex directly onto your iPhone 17 Home Screen for an instant, app-like experience that works completely offline with zero tracking.
        </p>

        {/* Step by step visual instructions */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Share size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">1. Tap the Share Button</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                In Safari, tap the Share icon (square with an arrow pointing upward) in the bottom toolbar.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <PlusSquare size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">2. Tap "Add to Home Screen"</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scroll down in the share sheet and tap <strong>"Add to Home Screen"</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">3. Tap "Add" (Top Right)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Confirm by tapping <strong>Add</strong>. The Nicotex icon will appear on your Home Screen.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Capabilities & iOS Notes */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-cyan-300 font-bold">
            <ShieldCheck size={16} />
            <span>iPhone 17 PWA Architecture</span>
          </div>
          <ul className="text-slate-300 space-y-1.5 text-[11px]">
            <li className="flex items-center gap-1.5">
              <WifiOff size={13} className="text-emerald-400" />
              <span><strong>100% Offline:</strong> Cached locally using service workers.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Bell size={13} className="text-cyan-400" />
              <span><strong>iOS Notifications:</strong> Supported once added to Home Screen on iOS 16.4+.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Smartphone size={13} className="text-amber-400" />
              <span><strong>Dynamic Island & Safe Areas:</strong> Native viewport padding tailored for iPhone.</span>
            </li>
          </ul>
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onClose}
        >
          Got It
        </Button>
      </div>
    </Modal>
  );
};
