"use client";
import React from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';
import ProgressBar from '../../../components/ProgressBar';
import FoodRecognition from '../../../components/FoodRecognition';
import NutritionBreakdown from '../../../components/NutritionBreakdown';
import NutritionDonutChart from '../../../components/NutritionDonutChart';
import CulturalRecommendations from '../../../components/CulturalRecommendations';
import MealAnalysis from '../../../components/MealAnalysis';
import API from '../../../lib/api/axios';
import { useState, useEffect } from 'react';

export default function DashboardNutritionPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  type RecognitionResult = { meal_label: string; calories: number; sodium: number; sugar: number; unhealthy_score: number; confidence: number };
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [recentRecognitions, setRecentRecognitions] = useState<RecognitionResult[]>([
    { meal_label: 'Avocado Salad', calories: 280, sodium: 150, sugar: 4, unhealthy_score: 22, confidence: 0.9 },
    { meal_label: 'Chicken Curry', calories: 650, sodium: 1100, sugar: 6, unhealthy_score: 72, confidence: 0.88 },
    { meal_label: 'Paneer Wrap', calories: 420, sodium: 800, sugar: 5, unhealthy_score: 55, confidence: 0.81 },
  ]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/auth/profile');
        if (res?.data?.success) setProfile(res.data.data);
      } catch {
        // ignore - guest
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Nutrition" showBack={true} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Nutrition & Food Recognition</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <FoodRecognition onResult={(r) => { setResult(r); if (r) setRecentRecognitions(prev => [r, ...prev].slice(0, 5)); }} userProfile={profile ?? undefined} />
            </div>
            <div className="mt-4 bg-white rounded-2xl shadow-lg p-4">
              <h4 className="font-semibold mb-3 text-gray-900">Recent Recognitions</h4>
              <ul className="space-y-2">
                {recentRecognitions.map((rec, i) => (
                  <li key={i} className="flex justify-between items-center border-b border-gray-100 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{rec.meal_label}</div>
                      <div className="text-xs text-gray-500">{rec.calories} kcal • {rec.sodium} mg sodium</div>
                    </div>
                    <div className="text-sm text-gray-500">{Math.round(rec.confidence * 100)}%</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            {result ? (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <NutritionBreakdown calories={result.calories} sodium={result.sodium} sugar={result.sugar} userProfile={profile ?? undefined} />
                  <div className="mt-4">
                    <NutritionDonutChart calories={result.calories} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <CulturalRecommendations mealLabel={result.meal_label} />
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <MealAnalysis unhealthyScore={result.unhealthy_score} mealLabel={result.meal_label} chronicCondition={profile?.chronic_condition ? String(profile?.chronic_condition) : undefined} />
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="text-gray-800 font-semibold mb-2">Nutrition Goals</div>
                  <div className="text-sm text-gray-600">Calories goal: <span className="font-semibold">2000 kcal</span></div>
                  <div className="text-sm text-gray-600">Calories consumed: <span className="font-semibold">750 kcal</span></div>
                  <div className="w-full mt-2"><ProgressBar progress={(750 / 2000) * 100} /></div>
                  <div className="text-sm text-gray-600 mt-2">Sodium limit: <span className="font-semibold">2300 mg</span></div>
                  <div className="text-sm text-gray-600">Sugar target: <span className="font-semibold">36 g</span></div>
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-2 bg-blue-600 text-white rounded">Add meal</button>
                    <button className="px-3 py-2 border border-gray-200 rounded">Set goal</button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="text-gray-800 font-semibold mb-2">Helpful tips</div>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    <li>Prefer whole grains and lean proteins for balanced meals.</li>
                    <li>Watch sodium from sauces and pick low-sodium options.</li>
                    <li>Include vegetables to increase fiber and satiety.</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="text-gray-800 font-semibold mb-2">Featured Recipes</div>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>Quinoa & Veggie Bowl — High fiber, low fat</li>
                    <li>Grilled Salmon with Herbs — Low sodium, high omega-3</li>
                    <li>Chickpea Salad Wrap — Vegetarian protein and fiber</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
