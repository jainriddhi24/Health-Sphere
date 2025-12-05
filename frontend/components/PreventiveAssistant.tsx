"use client";
import { useState, useEffect } from 'react';
import API from '../lib/api/axios';
import WarningCard from './WarningCard';
import Notification from './Notification';

type HealthProfile = {
  user_id: string;
  age: number;
  gender: string;
  chronic_condition?: string;
  recent_meals?: Record<string, unknown>[];
  recent_workouts?: Record<string, unknown>[];
  current_risk_score?: number;
  health_metrics?: Record<string, unknown>;
};

export default function PreventiveAssistant() {
  const [profile, setProfile] = useState<HealthProfile>({
    user_id: 'guest',
    age: 30,
    gender: 'male',
    chronic_condition: '',
    recent_meals: [],
    recent_workouts: [],
    current_risk_score: 0.2,
    health_metrics: {}
  });
  const [warnings, setWarnings] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/auth/profile');
        if (res?.data?.success && res.data.data) {
          const d = res.data.data;
          setProfile(prev => ({
            ...prev,
            user_id: d.id || prev.user_id,
            age: d.age ?? prev.age,
            gender: d.gender ?? prev.gender,
            chronic_condition: d.chronic_condition ?? prev.chronic_condition,
            current_risk_score: d.current_risk_score ?? prev.current_risk_score,
            recent_meals: d.recent_meals ?? prev.recent_meals,
            recent_workouts: d.recent_workouts ?? prev.recent_workouts,
            health_metrics: d.health_metrics ?? prev.health_metrics,
          }));
        }
      } catch {
        // ignore - guest mode
      }
    };
    fetchProfile();
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setSummary(null);

    try {
      const res = await API.post('/assistant/check-warnings', profile);
      setWarnings(res.data.warnings || []);
      setSummary(res.data.summary || null);
    } catch (err: unknown) {
      console.warn(err);
      const e = err as { response?: { status?: number } } | undefined;
      if (e?.response?.status === 501) {
        setError('Preventive assistant is not implemented on the server yet. This is a demo UI.');
      } else {
        setError('Unable to evaluate warnings');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-2">Preventive Health Assistant</h2>
      <div className="text-sm text-gray-600 mb-4">Get early warning alerts and preventive suggestions based on your profile and activity. The assistant can suggest low-effort daily tasks tailored to your health goals.</div>
      {error && <Notification message={error} type="error" onClose={() => setError(null)} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-600">Age</label>
          <input placeholder="e.g., 30" type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg placeholder-gray-400 text-gray-900" />

          <label className="block text-sm font-medium text-gray-600">Gender</label>
          <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <label className="block text-sm font-medium text-gray-600">Chronic condition (e.g. diabetes)</label>
          <input placeholder="e.g., diabetes" type="text" value={profile.chronic_condition} onChange={(e) => setProfile({ ...profile, chronic_condition: e.target.value })} className="w-full px-3 py-2 border rounded-lg placeholder-gray-400 text-gray-900" />

          <label className="block text-sm font-medium text-gray-600">Current risk score (0-1)</label>
          <input placeholder="e.g., 0.2" type="number" step="0.01" min="0" max="1" value={profile.current_risk_score} onChange={(e) => setProfile({ ...profile, current_risk_score: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg placeholder-gray-400 text-gray-900" />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-600">Recent meals (JSON list)</label>
          <textarea placeholder='[{"meal_label":"pizza","calories":350}]' value={JSON.stringify(profile.recent_meals)} onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setProfile({ ...profile, recent_meals: parsed });
            } catch {
              // ignore parse errors while typing
            }
          }} className="w-full p-2 border rounded h-28" />

          <label className="block text-sm font-medium text-gray-600">Recent workouts (JSON list)</label>
          <textarea placeholder='[{"workout_type":"jogging","duration_minutes":30}]' value={JSON.stringify(profile.recent_workouts)} onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setProfile({ ...profile, recent_workouts: parsed });
            } catch {
              // ignore parse errors while typing
            }
          }} className="w-full p-2 border rounded h-28" />

        </div>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={submit} disabled={loading}>{loading ? 'Evaluating...' : 'Check Warnings'}</button>
      </div>

      {summary && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <div className="font-medium">Summary</div>
          <div className="text-sm text-gray-700">{summary}</div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w, idx) => (
            <WarningCard warning={w} key={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
