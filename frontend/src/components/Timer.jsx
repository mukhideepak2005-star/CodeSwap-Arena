import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Pause } from 'lucide-react';

export default function Timer({ initialSeconds = 0, isPaused = false, status = 'live', onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, isPaused, onExpire]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedTime = [
    hours > 0 ? String(hours).padStart(2, '0') : null,
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ]
    .filter(Boolean)
    .join(':');

  const isUrgent = secondsLeft < 300 && secondsLeft > 0;
  const isCritical = secondsLeft < 60 && secondsLeft > 0;
  const isEnded = secondsLeft === 0;

  let colorClasses = 'bg-slate-800/80 text-white border-slate-700';
  if (isPaused) {
    colorClasses = 'bg-amber-950/40 text-amber-300 border-amber-800/50';
  } else if (isCritical) {
    colorClasses = 'bg-rose-950/60 text-rose-300 border-rose-800/80 animate-pulse';
  } else if (isUrgent) {
    colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-700/60';
  } else if (isEnded) {
    colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-sm font-semibold tracking-wider font-mono shadow-sm transition-all ${colorClasses}`}>
      {isPaused ? (
        <Pause className="w-4 h-4 text-amber-400" />
      ) : isCritical ? (
        <AlertCircle className="w-4 h-4 text-rose-400 animate-bounce" />
      ) : (
        <Clock className="w-4 h-4 text-indigo-400" />
      )}

      <span>{isEnded ? '00:00 - TIME EXPIRED' : formattedTime}</span>

      {isPaused && (
        <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-sans font-bold">
          Paused
        </span>
      )}
    </div>
  );
}
