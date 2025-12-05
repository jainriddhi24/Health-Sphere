import React from 'react';
import ProgressBar from './ProgressBar';

type Props = {
  calories: number;
  sodium: number;
  sugar: number;
};

export default function NutritionBreakdown({ calories, sodium, sugar, userProfile }: Props & { userProfile?: Record<string, any> }) {
  // Simple recommended daily values for visualization
  const dailyCalories = 2000;
  const dailySodium = 2300; // mg
  // Lower sugar guidance for diabetes
  const dailySugar = userProfile?.chronic_condition?.toLowerCase?.().includes('diabetes') ? 20 : 36; // g recommended (men)

  return (
    <div className="p-2">
      <h4 className="font-medium text-gray-900 mb-3 text-lg">Nutrition Breakdown</h4>
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1"><div>Calories</div><div>{calories} kcal</div></div>
        <ProgressBar progress={(calories / dailyCalories) * 100} />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1"><div>Sodium</div><div>{sodium} mg</div></div>
        <ProgressBar progress={(sodium / dailySodium) * 100} />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1"><div>Sugar</div><div>{sugar} g</div></div>
        <ProgressBar progress={(sugar / dailySugar) * 100} />
      </div>

      <div className="text-xs text-gray-500 mt-2">Daily reference values are approximate and vary by age, sex, and activity level.</div>
    </div>
  );
}
