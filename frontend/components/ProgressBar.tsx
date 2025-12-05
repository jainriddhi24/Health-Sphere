import React from 'react';

type ProgressBarProps = {
  progress: number; // 0 - 100
};

export default function ProgressBar({ progress = 0 }: ProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${safeProgress}%` }} />
    </div>
  );
}
