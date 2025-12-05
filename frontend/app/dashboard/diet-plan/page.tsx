"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import DashboardHeader from '@/components/DashboardHeader';
import API from "@/lib/api/axios";

interface DietPlan {
  id: string;
  name: string;
  duration: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: Meal[];
  createdAt: string;
}

interface Meal {
  name: string;
  time: string;
  calories: number;
  items: string[];
}

interface UserProfile {
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  chronic_condition?: string;
  health_goals?: string;
}

export default function DietPlanPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    (async () => {
      try {
        const res = await API.get("/auth/profile", { headers: { Authorization: `Bearer ${token}` } });
        setUser(res.data.data);
        
        // Generate default diet plans based on user profile
        const defaultPlans = generateDefaultPlans(res.data.data);
        setDietPlans(defaultPlans);
        if (defaultPlans.length > 0) {
          setSelectedPlan(defaultPlans[0]);
        }
      } catch (e) {
        console.warn(e);
        localStorage.removeItem("token");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const generateDefaultPlans = (userProfile: UserProfile): DietPlan[] => {
    const plans: DietPlan[] = [];

    // Plan 1: Balanced Diet
    plans.push({
      id: "balanced",
      name: "Balanced Diet Plan",
      duration: "7 days",
      calories: 2000,
      protein: 100,
      carbs: 250,
      fats: 65,
      meals: [
        {
          name: "Breakfast",
          time: "7:00 AM",
          calories: 400,
          items: ["Oatmeal with berries", "Whole wheat toast", "Green tea"]
        },
        {
          name: "Mid-Morning Snack",
          time: "10:00 AM",
          calories: 150,
          items: ["Apple", "Almonds (25g)"]
        },
        {
          name: "Lunch",
          time: "1:00 PM",
          calories: 600,
          items: ["Grilled chicken (150g)", "Brown rice (150g)", "Steamed broccoli", "Olive oil"]
        },
        {
          name: "Evening Snack",
          time: "4:00 PM",
          calories: 150,
          items: ["Greek yogurt (150g)", "Honey", "Granola"]
        },
        {
          name: "Dinner",
          time: "7:30 PM",
          calories: 500,
          items: ["Baked salmon (120g)", "Sweet potato (150g)", "Spinach salad", "Lemon dressing"]
        },
        {
          name: "Before Bed",
          time: "9:00 PM",
          calories: 200,
          items: ["Warm milk", "Chamomile tea", "Dark chocolate (20g)"]
        }
      ],
      createdAt: new Date().toISOString()
    });

    // Plan 2: High Protein (for fitness)
    plans.push({
      id: "highprotein",
      name: "High Protein Plan",
      duration: "7 days",
      calories: 2200,
      protein: 150,
      carbs: 220,
      fats: 60,
      meals: [
        {
          name: "Breakfast",
          time: "7:00 AM",
          calories: 450,
          items: ["Egg whites (4)", "Whole wheat bread (2 slices)", "Peanut butter"]
        },
        {
          name: "Mid-Morning Snack",
          time: "10:00 AM",
          calories: 200,
          items: ["Protein shake", "Banana"]
        },
        {
          name: "Lunch",
          time: "1:00 PM",
          calories: 600,
          items: ["Grilled chicken (200g)", "Basmati rice (100g)", "Beans", "Vegetables"]
        },
        {
          name: "Pre-Workout",
          time: "4:00 PM",
          calories: 200,
          items: ["Banana", "Almond butter", "Water"]
        },
        {
          name: "Dinner",
          time: "7:30 PM",
          calories: 550,
          items: ["Lean beef (150g)", "Sweet potato", "Green salad"]
        },
        {
          name: "Before Bed",
          time: "9:00 PM",
          calories: 200,
          items: ["Casein protein shake", "Almonds"]
        }
      ],
      createdAt: new Date().toISOString()
    });

    // Plan 3: Low Calorie (for weight loss)
    plans.push({
      id: "lowcalorie",
      name: "Weight Loss Plan",
      duration: "7 days",
      calories: 1500,
      protein: 110,
      carbs: 150,
      fats: 40,
      meals: [
        {
          name: "Breakfast",
          time: "7:00 AM",
          calories: 300,
          items: ["Vegetable omelette (2 eggs)", "Whole wheat toast (1 slice)", "Green tea"]
        },
        {
          name: "Mid-Morning Snack",
          time: "10:00 AM",
          calories: 100,
          items: ["Orange", "Water"]
        },
        {
          name: "Lunch",
          time: "1:00 PM",
          calories: 400,
          items: ["Grilled fish (120g)", "Brown rice (100g)", "Steamed vegetables"]
        },
        {
          name: "Evening Snack",
          time: "4:00 PM",
          calories: 100,
          items: ["Low-fat yogurt (100g)", "Berries"]
        },
        {
          name: "Dinner",
          time: "7:30 PM",
          calories: 400,
          items: ["Grilled chicken (100g)", "Salad with olive oil", "Lentil soup"]
        },
        {
          name: "Before Bed",
          time: "9:00 PM",
          calories: 100,
          items: ["Green tea", "Low-fat milk"]
        }
      ],
      createdAt: new Date().toISOString()
    });

    // Plan 4: Vegetarian
    plans.push({
      id: "vegetarian",
      name: "Vegetarian Plan",
      duration: "7 days",
      calories: 1900,
      protein: 80,
      carbs: 260,
      fats: 55,
      meals: [
        {
          name: "Breakfast",
          time: "7:00 AM",
          calories: 400,
          items: ["Paneer paratha", "Low-fat yogurt", "Green chutney"]
        },
        {
          name: "Mid-Morning Snack",
          time: "10:00 AM",
          calories: 150,
          items: ["Mixed nuts", "Banana"]
        },
        {
          name: "Lunch",
          time: "1:00 PM",
          calories: 550,
          items: ["Dal with spinach", "Basmati rice", "Cucumber raita", "Vegetable curry"]
        },
        {
          name: "Evening Snack",
          time: "4:00 PM",
          calories: 150,
          items: ["Chickpea snack", "Herbal tea"]
        },
        {
          name: "Dinner",
          time: "7:30 PM",
          calories: 500,
          items: ["Paneer tikka", "Roti (2)", "Mixed vegetable curry", "Mint chutney"]
        },
        {
          name: "Before Bed",
          time: "9:00 PM",
          calories: 150,
          items: ["Warm turmeric milk", "Almonds"]
        }
      ],
      createdAt: new Date().toISOString()
    });

    return plans;
  };

  const generateCustomPlan = async () => {
    setGenerating(true);
    try {
      // Simulate API call to generate a custom diet plan
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const customPlan: DietPlan = {
        id: `custom-${Date.now()}`,
        name: "AI-Generated Custom Plan",
        duration: "7 days",
        calories: 2000,
        protein: 100,
        carbs: 250,
        fats: 65,
        meals: [
          {
            name: "Breakfast",
            time: "7:00 AM",
            calories: 400,
            items: ["Quinoa with fruits", "Almond milk", "Honey"]
          },
          {
            name: "Mid-Morning Snack",
            time: "10:00 AM",
            calories: 150,
            items: ["Protein bar", "Water"]
          },
          {
            name: "Lunch",
            time: "1:00 PM",
            calories: 600,
            items: ["Tofu curry", "Jasmine rice", "Vegetable medley"]
          },
          {
            name: "Evening Snack",
            time: "4:00 PM",
            calories: 150,
            items: ["Smoothie bowl", "Seeds"]
          },
          {
            name: "Dinner",
            time: "7:30 PM",
            calories: 500,
            items: ["Grilled vegetables", "Couscous", "Tahini sauce"]
          },
          {
            name: "Before Bed",
            time: "9:00 PM",
            calories: 200,
            items: ["Herbal tea", "Dates"]
          }
        ],
        createdAt: new Date().toISOString()
      };
      
      setDietPlans([...dietPlans, customPlan]);
      setSelectedPlan(customPlan);
    } catch (e) {
      console.error("Error generating custom plan:", e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading diet plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Diet Plan" showBack={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-2">Your Personalized Diet Plans</h1>
          <p className="text-cyan-100 text-lg">Choose a plan that suits your health goals and lifestyle</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {/* Diet Plans List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sticky top-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Available Plans</h3>
              <div className="space-y-2 mb-6">
                {dietPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedPlan?.id === plan.id
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    <div className="font-semibold text-sm">{plan.name}</div>
                    <div className={`text-xs ${selectedPlan?.id === plan.id ? "text-cyan-100" : "text-gray-600"}`}>
                      {plan.calories} cal/day
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={generateCustomPlan}
                disabled={generating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg hover:shadow-lg disabled:opacity-50 transition"
              >
                {generating ? "Generating..." : "✨ Generate Custom Plan"}
              </button>
            </div>
          </div>

          {/* Plan Details */}
          <div className="lg:col-span-3">
            {selectedPlan ? (
              <div className="space-y-6">
                {/* Macronutrient Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900">{selectedPlan.name}</h2>
                  
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{selectedPlan.calories}</div>
                      <div className="text-sm text-gray-600 mt-2">Total Calories</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">{selectedPlan.protein}g</div>
                      <div className="text-sm text-gray-600 mt-2">Protein</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-600">{selectedPlan.carbs}g</div>
                      <div className="text-sm text-gray-600 mt-2">Carbs</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-orange-600">{selectedPlan.fats}g</div>
                      <div className="text-sm text-gray-600 mt-2">Fats</div>
                    </div>
                  </div>

                  {/* Macronutrient Pie Chart */}
                  <div className="flex justify-center items-center">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="60" />
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="60"
                        strokeDasharray={`${(selectedPlan.protein / (selectedPlan.protein + selectedPlan.carbs + selectedPlan.fats)) * 502} 502`}
                        transform="rotate(-90 100 100)"
                      />
                      <text x="100" y="110" textAnchor="middle" className="text-lg font-bold">
                        Macro Mix
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Daily Meal Schedule */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Daily Meal Schedule</h3>
                  <div className="space-y-4">
                    {selectedPlan.meals.map((meal, index) => (
                      <div key={index} className="border-l-4 border-cyan-600 pl-4 py-3 hover:bg-gray-50 rounded-r transition">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">{meal.name}</h4>
                            <p className="text-sm text-gray-500">{meal.time}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-cyan-600">{meal.calories} cal</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {meal.items.map((item, idx) => (
                            <span key={idx} className="bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-sm">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-l-4 border-green-600">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">💡 Diet Tips</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Stay hydrated - drink at least 8 glasses of water daily</li>
                    <li>✓ Meal prep on Sundays to stay consistent throughout the week</li>
                    <li>✓ Listen to your body - adjust portions based on hunger levels</li>
                    <li>✓ Include seasonal vegetables for better nutrition</li>
                    <li>✓ Track your meals to monitor progress</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-500 text-lg">Select a diet plan to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
