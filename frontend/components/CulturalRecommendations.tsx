import React from 'react';

export default function CulturalRecommendations({ mealLabel }: { mealLabel?: string }) {
  const mapping: { [key: string]: string[] } = {
    'sushi': [
      'Consider avoiding high-sodium soy sauce or choose low-sodium options.',
      'Add a side of salad or miso soup to increase vegetables and fiber.'
    ],
    'pizza': [
      'Choose a thin crust and load up on vegetable toppings.',
      'Limit extra cheese to reduce saturated fats.'
    ],
    'curry': [
      'Opt for tomato-based curries and more vegetables.',
      'Limit coconut-cream heavy curries and watch portion sizes.'
    ],
    'salad': [
      'Include a source of protein (chicken, tofu, beans) to keep you full.',
      'Use vinaigrette rather than creamy dressings to reduce calories.'
    ]
  };

  const recs = mealLabel ? (mapping[mealLabel.toLowerCase()] || []) : [];

  return (
    <div className="p-2">
      <h4 className="font-medium mb-2">Cultural / Cuisine Recommendations</h4>
      {mealLabel ? (
        recs.length ? (
          <ul className="list-disc list-inside space-y-1 text-sm">
            {recs.map((r, idx) => <li key={idx}>{r}</li>)}
          </ul>
        ) : (
          <div className="text-sm text-gray-600">No specific suggestions for <span className="font-semibold">{mealLabel}</span>. General advice: prefer whole grains, vegetables, lean protein, and limit added sugar & sodium.</div>
        )
      ) : (
        <div className="text-sm text-gray-500">Recognize a food to get culturally contextual diet tips.</div>
      )}
    </div>
  );
}
