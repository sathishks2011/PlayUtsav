import React, { useEffect, useState } from 'react';

interface BioscopeTimerProps {
  timeRemaining: number | null;
  duration: number;
  isActive: boolean;
  warningThreshold?: number;
  onTimeUp?: () => void;
}

export const BioscopeTimer: React.FC<BioscopeTimerProps> = ({
  timeRemaining,
  duration,
  isActive,
  warningThreshold = 10,
  onTimeUp,
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining ?? duration);

  useEffect(() => {
    if (timeRemaining !== null) {
      setDisplayTime(timeRemaining);
    }
  }, [timeRemaining]);

  useEffect(() => {
    if (displayTime === 0 && isActive) {
      onTimeUp?.();
    }
  }, [displayTime, isActive, onTimeUp]);

  if (!isActive) {
    return null;
  }

  const percentage = duration > 0 ? (displayTime / duration) * 100 : 0;
  const isWarning = displayTime <= warningThreshold;
  const isCritical = displayTime <= 5;

  return (
    <div className="space-y-2">
      {/* Timer Display */}
      <div
        className={`text-center py-3 px-6 rounded-lg transition-all duration-300 ${
          isCritical
            ? 'bg-red-500/20 border-2 border-red-500 animate-pulse'
            : isWarning
            ? 'bg-yellow-500/20 border-2 border-yellow-500'
            : 'bg-blue-500/20 border-2 border-blue-500'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">
            {isCritical ? '⏰' : isWarning ? '⚠️' : '⏱️'}
          </span>
          <span
            className={`text-3xl font-bold font-mono ${
              isCritical
                ? 'text-red-400'
                : isWarning
                ? 'text-yellow-400'
                : 'text-blue-400'
            }`}
          >
            {displayTime}s
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <progress
        className={`w-full h-3 rounded-full overflow-hidden [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-700 [&::-webkit-progress-value]:ease-linear ${
          isCritical
            ? '[&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-red-500'
            : isWarning
            ? '[&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-yellow-500'
            : '[&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-blue-500'
        }`}
        value={displayTime}
        max={duration}
      />

      {/* Status Text */}
      <p className="text-center text-sm text-gray-400">
        {isCritical
          ? 'Time is running out!'
          : isWarning
          ? 'Hurry up!'
          : 'Answer now for bonus points!'}
      </p>
    </div>
  );
};
