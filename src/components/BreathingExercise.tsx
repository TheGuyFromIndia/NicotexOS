import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

interface BreathingExerciseProps {
  onCycleComplete?: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale';

export const BreathingExercise: React.FC<BreathingExerciseProps> = () => {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [countdown, setCountdown] = useState<number>(4);
  const [cycleCount, setCycleCount] = useState<number>(0);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (phase === 'inhale') {
            setPhase('hold');
            return 7;
          } else if (phase === 'hold') {
            setPhase('exhale');
            return 8;
          } else {
            setPhase('inhale');
            setCycleCount(c => c + 1);
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, phase]);

  const phaseInstruction = {
    inhale: 'Breathe in slowly through your nose...',
    hold: 'Hold your breath gently and relax your shoulders...',
    exhale: 'Slow, complete exhale through your mouth...'
  }[phase];

  const phaseColor = {
    inhale: 'from-cyan-400 to-sky-500',
    hold: 'from-indigo-400 to-purple-500',
    exhale: 'from-emerald-400 to-teal-500'
  }[phase];

  const scale = {
    inhale: 'scale-125 duration-[4000ms]',
    hold: 'scale-125 duration-1000',
    exhale: 'scale-90 duration-[8000ms]'
  }[phase];

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      {/* Animated Breathing Orb */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Outer ambient glow */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr ${phaseColor} opacity-20 blur-2xl transition-all duration-1000`}
        />
        {/* Animated breathing circle */}
        <div
          className={`w-40 h-40 rounded-full bg-gradient-to-tr ${phaseColor} flex flex-col items-center justify-center shadow-2xl transition-transform ease-in-out ${scale}`}
        >
          <span className="text-4xl font-extrabold text-slate-950 tracking-tighter">
            {countdown}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900/80 mt-1">
            {phase}
          </span>
        </div>
      </div>

      {/* Instruction text */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-200">
          {phaseInstruction}
        </p>
        <p className="text-xs text-slate-400">
          Cycle {cycleCount + 1} completed • 4-7-8 Relaxation Rhythm
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? <Pause size={16} className="mr-1.5" /> : <Play size={16} className="mr-1.5" />}
          {isActive ? 'Pause' : 'Resume'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setPhase('inhale');
            setCountdown(4);
            setCycleCount(0);
          }}
        >
          <RotateCcw size={16} className="mr-1.5" />
          Reset
        </Button>
      </div>
    </div>
  );
};
