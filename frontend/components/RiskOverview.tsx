"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';

export default function RiskOverview({ risk, forecast, altForecasts }:{ risk: number; forecast: number[]; altForecasts?: { label: string; data: number[]; color?: string }[] }) {
  // Prepare data for Recharts
  const data = forecast.map((v, i) => ({ month: `M${i+1}`, risk: Math.round(v) }));
  const altData = (altForecasts || []).map(f => ({ label: f.label, data: f.data.map((v, i) => ({ month: `M${i+1}`, risk: Math.round(v) })) }));

  // Small radial gauge using Pie
  const gaugeData = [
    { name: 'Risk', value: risk },
    { name: 'Rest', value: Math.max(0, 100 - risk) }
  ];

  const colors = ['#ef4444', '#e5e7eb'];

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm">Future forecast (12 months)</div>
              <div className="text-lg font-semibold">Health risk trajectory</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-red-600">{risk}%</div>
              <div className="text-sm text-gray-500">Higher is worse</div>
            </div>
          </div>
          <div className="mt-4 w-full h-56">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 10, right: 20, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <ReferenceLine y={50} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Moderate risk', position: 'right', fill: '#f97316' }} />
                <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} />
                {altData.map((alt, idx) => (
                  <Line key={alt.label} type="monotone" data={alt.data} dataKey="risk" stroke={altForecasts?.[idx]?.color ?? '#3b82f6'} strokeWidth={2} dot={{ r: 0 }} opacity={0.85} />
                ))}
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Current risk</div>
              <div className="text-2xl font-bold text-red-600">{risk}%</div>
            </div>
            <div style={{ width: 120, height: 120 }}>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={gaugeData} startAngle={210} endAngle={-30} innerRadius={42} outerRadius={60} dataKey="value">
                    {gaugeData.map((entry, idx) => (
                      <Cell key={idx} fill={colors[idx % colors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Model confidence: <span className="font-semibold">72%</span> • Next update: in 7 days
          </div>
          <div className="mt-2 text-sm text-gray-700">
            The trajectory above shows a scenario based on your current inputs; use the What-if simulation to compare how changes in weight, activity or medications may affect the trend.
          </div>
        </div>
      </div>
    </div>
  );
}
