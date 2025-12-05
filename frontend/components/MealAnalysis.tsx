import React from 'react';

export default function MealAnalysis({ unhealthyScore, mealLabel, chronicCondition }: { unhealthyScore?: number; mealLabel?: string; chronicCondition?: string }) {
  const s = unhealthyScore ?? 0;
  const baseAdvice = s >= 75 ? 'This meal looks unhealthy — consider reducing portion or swapping out high-fat or high-sugar items.' : (s >= 40 ? 'Moderately healthy — consider adding veggies or reducing sodium.' : 'This meal looks healthy — keep the balanced nutrients!');
  const diabetesWarning = chronicCondition?.toLowerCase?.().includes('diabetes') ? ' As you have diabetes, limit sugars and refined carbs. Prioritize proteins and vegetables.' : '';
  const advice = baseAdvice + diabetesWarning;
  const color = s >= 75 ? 'text-red-700' : (s >= 40 ? 'text-yellow-800' : 'text-green-700');

  return (
    <div className="p-2">
      <h4 className="font-medium text-gray-900 mb-3 text-lg">Meal Analysis</h4>
      {mealLabel && <div className="text-sm text-gray-600 mb-2">Analyzing: <span className="font-semibold">{mealLabel}</span></div>}
      <div className={`${color} font-semibold text-sm mb-2`}>Health summary: {advice}</div>
      <ul className="list-disc list-inside text-sm text-gray-700">
        <li>Consider reducing highly processed or deep-fried foods</li>
        <li>Balance the meal with vegetables and fiber</li>
        <li>Consider exercise to offset occasional indulgence</li>
      </ul>
    </div>
  );
}
