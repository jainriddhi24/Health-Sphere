"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';
import API from "@/lib/api/axios";
import RiskOverview from '@/components/RiskOverview';
import WhatIfSimulation from '@/components/WhatIfSimulation';
import TimeMachine from '@/components/TimeMachine';

function simpleRiskScore({ age, bmi, chronic }: { age: number; bmi: number; chronic?: string }): number {
  let score = 0;
  score += (age - 30) * 0.3; // age factor
  score += Math.max(0, (bmi - 22)) * 3; // bmi
  if (chronic && chronic !== 'none') score += 15;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

interface UserProfile { id?: string; name?: string; height?: number; weight?: number; age?: number; chronic_condition?: string }
interface ServerForecast { id?: string; risk?: number; prediction?: number[]; risk_trend?: string; generated_at?: string }
export default function RiskForecastPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [activity, setActivity] = useState<'low'|'medium'|'high'>('medium');
  const [chronic, setChronic] = useState<string | null>(null);
  const [serverForecast, setServerForecast] = useState<ServerForecast | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [altForecasts, setAltForecasts] = useState<{ label: string; data: number[]; color?: string }[]>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  type ServerErrorData = { error?: { message?: string }; message?: string; [k: string]: unknown };

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const profileRes = await API.get<{ success: boolean; data: UserProfile }>('/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
        setUser(profileRes.data.data);
        // get forecast from server (server returns wrapper: { success: boolean, data: ServerForecast })
        const forecastRes = await API.get<{ success: boolean; data: ServerForecast }>('/risk/forecast', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        if (forecastRes && forecastRes.data && forecastRes.data.data) setServerForecast(forecastRes.data.data);
        setWeight(profileRes.data.data.weight ?? null);
        setAge(profileRes.data.data.age ?? null);
        setChronic(profileRes.data.data.chronic_condition ?? null);
      } catch (err: unknown) {
        console.warn('Recalculate error', err);
        // Try to extract server message
        const e = err as { response?: { status?: number; data?: ServerErrorData }; message?: string };
        const status = e.response?.status;
        const data = e.response?.data;
        let msg = 'Unable to recalculate risk';
        if (data?.error?.message) msg = data.error.message;
        else if (data?.message) msg = data.message;
        else if (e.message) msg = e.message;
        if (status) msg = `Server responded ${status}: ${msg}`;
        // If unauthorized, help user login again
        if (status === 401) {
          msg += ' — please log in again';
        }
        setServerError(msg);
        // Also log server response body for debugging
        if (data) console.warn('Server response body:', data);
        // If unauthorized, redirect the user to login after short delay
        if (status === 401) {
          setTimeout(() => { window.location.href = '/login'; }, 2000);
        }
      } finally { setRecalculating(false); }
    };
    fetch();
  }, []);

  const bmi = useMemo(() => {
    if (!weight || !user?.height) return 22;
    return Number((weight / ((user.height/100) ** 2)).toFixed(1));
  }, [weight, user]);

  const risk = useMemo(() => {
    if (serverForecast && serverForecast.risk !== undefined) return Number(serverForecast.risk);
    return simpleRiskScore({ age: age || 30, bmi, chronic: chronic || 'none' });
  }, [age, bmi, chronic, serverForecast]);

  // Simple synthetic forecast trajectory for display
  const forecast = useMemo(() => {
    if (serverForecast && serverForecast.prediction) return serverForecast.prediction;
    return Array.from({ length: 12 }).map((_, i) => Math.max(0, Math.min(100, risk + (i - 6) * (activity === 'high' ? -0.5 : activity === 'low' ? 1 : 0.2) + (i % 3 - 1) * 0.6)));
  }, [risk, activity, serverForecast]);

  const recalculate = async () => {
    try {
      setServerError(null);
      setRecalculating(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload: { age?: number; weight?: number; height?: number; chronic_condition?: string } = {};
      if (age) payload.age = age;
      if (!payload.height && user?.height) payload.height = user.height as number;
      if (weight) payload.weight = weight;
      if (chronic) payload.chronic_condition = chronic;
      const res = await API.post<{ success: boolean; data: ServerForecast }>('/risk/recalculate', payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.data) setServerForecast(res.data.data);
    } catch (err) { console.warn(err); }
    finally { setRecalculating(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      <DashboardHeader title="Risk Forecast" showBack={true} />
      {/* DashboardHeader inserted above, no need for extra top nav */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Predicted risk score</h2>
              <p className="text-gray-700">A model-derived risk estimate and projected trajectory for the next 12 months</p>
              <div className="mt-3 text-sm text-gray-700 flex gap-4">
                <div>Age: <span className="font-medium text-gray-900">{age ?? user?.age ?? '—'}</span></div>
                <div>Height: <span className="font-medium text-gray-900">{user?.height ? `${user.height} cm` : '—'}</span></div>
                <div>Weight: <span className="font-medium text-gray-900">{weight ?? user?.weight ?? '—'} kg</span></div>
                <div>BMI: <span className="font-medium text-gray-900">{Number(bmi).toFixed(1)}</span></div>
              </div>
            </div>
            <div className="text-right">
                <div aria-live="polite" className="text-4xl font-bold text-red-600">{risk}%</div>
              <div className="text-sm text-gray-500">Higher is worse</div>
            </div>
          </div>
          <div className="mt-6">
            <RiskOverview risk={risk} forecast={forecast} altForecasts={altForecasts} />
            {serverForecast && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow">
                  <div className="text-sm text-gray-700 font-semibold mb-1">AI Prediction</div>
                  <div className="text-sm text-gray-600">{serverForecast.risk_trend || 'Model expects modest changes based on current inputs'}</div>
                  {serverForecast.generated_at && <div className="mt-2 text-xs text-gray-500">Updated: {new Date(serverForecast.generated_at).toLocaleString()}</div>}
                </div>
                <div className="bg-white rounded-xl p-4 shadow">
                  <div className="text-sm text-gray-700 font-semibold mb-1">Predicted scores</div>
                  <div className="text-lg font-bold text-red-600">{serverForecast.risk ?? risk}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-800 font-medium">Age</label>
              <input aria-label="age" placeholder="30" className="w-full border border-gray-300 rounded p-2 text-sky-600 placeholder-gray-700 bg-white" type="number" value={age ?? ''} min={13} max={120} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <label className="text-sm text-gray-800 font-medium">Weight (kg)</label>
              <input aria-label="weight" placeholder="70" className="w-full border border-gray-300 rounded p-2 text-sky-600 placeholder-gray-700 bg-white" type="number" value={weight ?? ''} onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <label className="text-sm text-gray-800 font-medium">Activity level</label>
              <select aria-label="activity-level" value={activity} onChange={(e) => setActivity(e.target.value as 'low'|'medium'|'high')} className="w-full border border-gray-300 rounded p-2 text-sky-600 bg-white placeholder-gray-700">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-800 font-medium">Chronic condition</label>
              <input aria-label="chronic-condition" placeholder="none or e.g., diabetes" className="w-full border border-gray-300 rounded p-2 text-sky-600 placeholder-gray-700 bg-white" type="text" value={chronic ?? ''} onChange={(e) => setChronic(e.target.value)} />
            </div>
          </div>
            <div className="mt-4 flex items-center gap-3">
              <button disabled={recalculating} className={"px-4 py-2 bg-blue-600 text-white rounded hover:shadow-md focus:outline-none " + (recalculating ? 'opacity-70 cursor-not-allowed' : '')} onClick={recalculate}>{recalculating ? 'Recalculating...' : 'Recalculate'}</button>
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => { setServerForecast(null); setServerError(null); }}>Reset</button>
          </div>
            {serverError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                {serverError}
              </div>
            )}

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <div>
                <WhatIfSimulation baseForecast={forecast} onApply={(alts) => setAltForecasts(alts)} />
            </div>
            <div>
              <TimeMachine forecast={forecast} onJump={(i) => setSelectedMonthIndex(i)} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold">Explainable features</h3>
            <ul className="list-disc ml-6 text-sm text-gray-700">
              <li>Age increases risk by ~0.3 per year above 30</li>
              <li>BMI above 22 increases risk by ~3 per BMI point</li>
              <li>Chronic conditions add ~15 points</li>
            </ul>
          </div>
          {selectedMonthIndex !== null && (
            <div className="mt-2 bg-white rounded-xl p-3 shadow text-sm text-gray-700">
              Month {selectedMonthIndex + 1} — forecast: <span className="font-semibold text-red-600">{Math.round(forecast[selectedMonthIndex])}%</span>
            </div>
          )}
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
