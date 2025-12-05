"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function NutritionDonutChart({ calories, carbs, protein, fat }: { calories?: number; carbs?: number; protein?: number; fat?: number }) {
  // If macros not provided, try to estimate from calories
  // carbs: 4 kcal/g, protein: 4 kcal/g, fat: 9 kcal/g
  let c = carbs ?? 0;
  let p = protein ?? 0;
  let f = fat ?? 0;
  if (!c && !p && !f && calories) {
    // rough estimate
    c = Math.round((calories * 0.5) / 4);
    p = Math.round((calories * 0.25) / 4);
    f = Math.round((calories * 0.25) / 9);
  }
  const data = [
    { name: 'Carbs', value: c },
    { name: 'Protein', value: p },
    { name: 'Fat', value: f }
  ];
  const COLORS = ['#60a5fa', '#34d399', '#f97316'];
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="text-sm font-semibold">Nutrition breakdown</div>
      <div className="mt-3 h-44">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={36} outerRadius={72} paddingAngle={3} label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => `${value} g`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-gray-600">Estimated grams for common macros. Consider updating to track detailed nutrition.</div>
    </div>
  );
}
