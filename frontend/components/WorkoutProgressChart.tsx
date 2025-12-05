"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function WorkoutProgressChart({ data }: { data: { day: string; planned: number; completed: number }[] }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Weekly progress</div>
        <div className="text-xs text-gray-600">Planned vs Completed</div>
      </div>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} domain={[0, 'dataMax + 1']} />
            <Tooltip />
            <Line type="monotone" dataKey="planned" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
