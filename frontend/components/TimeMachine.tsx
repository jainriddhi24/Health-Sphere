"use client";
import React, { useEffect, useState } from 'react';

export default function TimeMachine({ forecast, onJump }: { forecast: number[]; onJump?: (monthIndex: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let t: number | undefined;
    if (playing) {
      t = window.setInterval(() => setCurrent(c => (c + 1) % forecast.length), 1200);
    }
    return () => { if (t) window.clearInterval(t); };
  }, [playing, forecast]);

  useEffect(() => { onJump?.(current); }, [current, onJump]);

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Time Machine</h4>
        <div className="text-xs text-gray-600">Jump through months</div>
      </div>
      <div className="mt-2">
        <input type="range" min={0} max={forecast.length - 1} value={current} onChange={e => setCurrent(Number(e.target.value))} className="w-full" />
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <div>Month: {current + 1}</div>
          <div>Value: {Math.round(forecast[current])}%</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className={`px-3 py-1 rounded ${playing ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`} onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setCurrent(0)}>Reset</button>
        </div>
      </div>
    </div>
  );
}
