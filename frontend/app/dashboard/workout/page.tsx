"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';
import API from "@/lib/api/axios";
import WorkoutProgressChart from '@/components/WorkoutProgressChart';

type WorkoutEntry = { id: string; title: string; duration: number };
type UserProfile = { id?: string; name?: string; age?: number };
const defaultWorkoutTemplates: Record<string, WorkoutEntry[]> = {
  beginner: [
    { id: 'w1', title: 'Brisk walk', duration: 20 },
    { id: 'w2', title: 'Bodyweight strength', duration: 20 },
    { id: 'w3', title: 'Stretch & mobility', duration: 10 },
  ],
  intermediate: [
    { id: 'w4', title: 'Jogging', duration: 25 },
    { id: 'w5', title: 'Circuit strength', duration: 30 },
    { id: 'w6', title: 'Core & mobility', duration: 15 },
  ],
  advanced: [
    { id: 'w7', title: 'Interval training', duration: 35 },
    { id: 'w8', title: 'Weighted strength', duration: 40 },
    { id: 'w9', title: 'Plyometrics', duration: 20 },
  ]
};

function choosePlan(level: 'beginner'|'intermediate'|'advanced') {
  return defaultWorkoutTemplates[level] || defaultWorkoutTemplates.beginner;
}

export default function WorkoutPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [level, setLevel] = useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [plan, setPlan] = useState<WorkoutEntry[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const completedCount = useMemo(() => Object.values(completed).filter(Boolean).length, [completed]);
  const totalPlanned = plan.length;

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await API.get('/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
        setUser(res.data.data as UserProfile);
        const age = res.data.data.age || 30;
        if (age < 30) setLevel('intermediate');
        if (age < 22) setLevel('advanced');
        setPlan(choosePlan(age < 22 ? 'advanced' : age < 30 ? 'intermediate' : 'beginner'));
        // load progress from localStorage
        const key = `workout:${res.data.data.id}:progress`;
        try { const p = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, boolean>; setCompleted(p); } catch { }
      } catch (err) { console.warn(err); }
    };
    fetch();
  }, []);

  const toggleComplete = (id: string) => {
    setCompleted(prev => {
      const nx = { ...prev, [id]: !prev[id] };
      if (user?.id) localStorage.setItem(`workout:${user.id}:progress`, JSON.stringify(nx));
      return nx;
    });
  };

  const regenerate = () => {
    setPlan(choosePlan(level));
    setCompleted({});
  };

  const [aiAdjust, setAiAdjust] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState<{ day: string; planned: number; completed: number }[]>([
    { day: 'Mon', planned: 1, completed: 1 },
    { day: 'Tue', planned: 0, completed: 0 },
    { day: 'Wed', planned: 1, completed: 0 },
    { day: 'Thu', planned: 0, completed: 0 },
    { day: 'Fri', planned: 1, completed: 0 },
    { day: 'Sat', planned: 0, completed: 0 },
    { day: 'Sun', planned: 0, completed: 0 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white">
      <DashboardHeader title="Workout Plans" showBack={true} />
      {/* DashboardHeader replaces the previous white nav; kept for consistent UX */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-2xl text-gray-900 p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-6 justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Adaptive Workout Plan</h1>
              <p className="text-sm text-gray-800">Personalized plans with quick workouts, progress tracking, and daily tips to stay motivated.</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => { setLevel('beginner'); setPlan(choosePlan('beginner')); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700">Start Quick 20-min</button>
              <button onClick={() => regenerate()} className="border border-gray-300 px-4 py-2 rounded-lg bg-white hover:shadow">Regenerate</button>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Plan</h2>
              <p className="text-gray-700">Adaptive plan created for your current profile</p>
            </div>
            <div>
              <select aria-label="Plan level" value={level} onChange={(e) => setLevel(e.target.value as 'beginner'|'intermediate'|'advanced')} className="border border-gray-300 rounded p-2 mr-2 text-sky-600 bg-white">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <button onClick={regenerate} className="bg-blue-600 text-white px-4 py-2 rounded">Regenerate</button>
            </div>
          </div>
          <div className="mt-6">
            <ul className="space-y-4">
              {plan.map((w) => (
                <li key={w.id} className="flex justify-between items-center border rounded p-4">
                  <div>
                    <div className="font-semibold text-gray-900">{w.title}</div>
                      <div className="text-sm text-gray-700">Duration: {w.duration} mins</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-gray-900"><input type="checkbox" className="accent-sky-600" checked={!!completed[w.id]} onChange={() => toggleComplete(w.id)} /> <span className="ml-1">Done</span></label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 text-right text-sm text-gray-700">Progress is saved locally (in browser).</div>
          </div>
        </div>
          <aside className="bg-white rounded-2xl p-6 shadow">
            <div className="text-center">
              <div className="w-28 h-28 rounded-full mx-auto bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold mb-3">{completedCount}/{totalPlanned}</div>
              <div className="text-sm text-gray-700">Workouts completed</div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Activity</h3>
              <p className="text-sm text-gray-600 mt-1">Kick off with 3-4 workouts this week — you&apos;re doing great! Keep up the momentum.</p>
              <div className="mt-3">
                <WorkoutProgressChart data={weeklyProgress} />
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Tip</h3>
              <p className="text-sm text-gray-700 mt-1">Try a short cooldown (5–10 mins) after intense sessions to reduce soreness and improve recovery.</p>
            </div>
            <div className="mt-6">
              <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Add to Today</button>
            </div>
            <div className="mt-4">
              <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-sky-600" checked={aiAdjust} onChange={() => setAiAdjust(!aiAdjust)} /> <span className="text-sm">AI adjust plan by progress</span></label>
              {aiAdjust && <div className="mt-2 text-xs text-gray-600">AI adapts the plan to prioritize recovery days and increase intensity when you complete your weekly targets.</div>}
            </div>
            <div className="mt-4 text-sm text-gray-500">Suggested playlist for workouts included in the plan.</div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded">Play Music</button>
              <button className="flex-1 border border-gray-200 py-2 rounded">Share</button>
            </div>
            <div className="mt-6 border-t pt-4 text-xs text-gray-600">
              Tip: Challenge yourself to increase one workout by +5 minutes this week ✨
            </div>
          </aside>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
