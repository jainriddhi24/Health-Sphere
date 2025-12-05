"use client";
import { useState, useEffect } from 'react';
import API from '../../lib/api/axios';
import FoodRecognition from '../../components/FoodRecognition';
import NutritionBreakdown from '../../components/NutritionBreakdown';
import CulturalRecommendations from '../../components/CulturalRecommendations';
import MealAnalysis from '../../components/MealAnalysis';
// removed duplicate React import to avoid 'React defined multiple times' build error

export default function NutritionPage() {
  const [result, setResult] = useState(null as any | null);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/auth/profile');
        if (res?.data?.success) setProfile(res.data.data);
      } catch (e) {
        // ignore; guest mode if not authenticated
      }
    };
    fetchProfile();
  }, []);
  // This page demonstrates a single layout where the FoodRecognition component returns results.
  // To improve UX, consider moving state up if components need to share the same result.
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nutrition & Food Recognition</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <FoodRecognition onResult={(r) => setResult(r)} userProfile={profile ?? undefined} />
          </div>
        </div>
        <div className="space-y-4">
          {result ? (
            <>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <NutritionBreakdown calories={result.calories} sodium={result.sodium} sugar={result.sugar} userProfile={profile ?? undefined} />
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <CulturalRecommendations mealLabel={result.meal_label} />
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <MealAnalysis unhealthyScore={result.unhealthy_score} mealLabel={result.meal_label} chronicCondition={profile?.chronic_condition} />
              </div>
            </>
          ) : (
            <div className="p-2 bg-transparent">
              <div className="text-gray-500">Nutrition summary and cultural suggestions will appear here when a food item is detected.</div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
