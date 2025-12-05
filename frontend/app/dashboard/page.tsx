"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';

type Source = string | { id?: string; text?: string; [key: string]: unknown };

type DangerFlag = {
  name: string;
  value: string | number;
  range?: string;
  [key: string]: unknown;
};

type Metadata = {
  danger_flags?: DangerFlag[];
  [key: string]: unknown;
};

type ProcessingResult = {
  text?: string;
  summary?: string;
  diet_plan?: string[];
  sources?: Source[];
  lab_values?: Array<{ parameter: string; value: string | number; unit: string; field: string }>;
  metadata?: Metadata;
  used_api?: boolean;
  model?: string;
};

interface DashboardUser {
  id?: string;
  name?: string;
  email?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  created_at?: string;
  medical_report_url?: string;
  medical_report_uploaded_at?: string | null;
  processing_result?: string | ProcessingResult | null | undefined;
}
import API from "@/lib/api/axios";
import dynamic from 'next/dynamic';
import ReportSummaryCard from '@/components/ReportSummaryCard';

export default function DashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);
  const Chatbot = dynamic(() => import('@/components/Chatbot'), { ssr: false });

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
      } catch (e) {
        console.warn(e);
        localStorage.removeItem("token");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    })();
    const onProfileUpdate = (e: Event) => {
      const evt = e as CustomEvent;
      if (evt?.detail) setUser(evt.detail as DashboardUser);
      else {
        // refetch if no detail
        (async () => {
          try {
            const t = localStorage.getItem('token');
            if (!t) return;
            const r = await API.get('/auth/profile', { headers: { Authorization: `Bearer ${t}` } });
            setUser(r.data.data);
            } catch (err) {
            console.warn(err);
          }
        })();
      }
    };
    window.addEventListener('profileUpdated', onProfileUpdate);
    return () => { window.removeEventListener('profileUpdated', onProfileUpdate); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Dashboard" showBack={false} />
      {/* Top nav for small screens */}
      <nav className="md:hidden bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <span className="text-lg font-bold text-gray-900">HealthSphere</span>
            </Link>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/dashboard/profile" className="text-gray-700 hover:text-blue-600 font-medium">Profile</Link>
            <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/' }} className="bg-red-600 text-white px-3 py-1 rounded">Logout</button>
          </div>
        </div>
      </nav>

      <div className="flex w-full px-4 sm:px-6 lg:px-8 py-12 gap-8 items-start">
        {/* Sidebar for md+ */}
        <aside className="hidden md:flex flex-col w-64 bg-white rounded-xl shadow p-4 sticky top-6 h-[calc(100vh-4rem)]">
          <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">HS</span>
            </div>
            <div className="text-lg font-bold text-gray-900">HealthSphere</div>
          </Link>
          <nav className="flex-1">
            <ul className="space-y-2">
              <li><Link href="/dashboard/profile" className="block px-3 py-2 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600">Profile</Link></li>
              <li><Link href="/dashboard/risk" className="block px-3 py-2 rounded hover:bg-red-50 text-gray-700 hover:text-red-600">Risk</Link></li>
              <li><Link href="/dashboard/workout" className="block px-3 py-2 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600">Workouts</Link></li>
              <li><Link href="/dashboard/schedule" className="block px-3 py-2 rounded hover:bg-green-50 text-gray-700 hover:text-green-600">Schedule</Link></li>
              <li><Link href="/dashboard/doctor-consultation" className="block px-3 py-2 rounded hover:bg-purple-50 text-gray-700 hover:text-purple-600">Consultations</Link></li>
              <li><Link href="/dashboard/nutrition" className="block px-3 py-2 rounded hover:bg-cyan-50 text-gray-700 hover:text-cyan-600">Nutrition</Link></li>
              <li><Link href="/dashboard/preventive-assistant" className="block px-3 py-2 rounded hover:bg-teal-50 text-gray-700 hover:text-teal-600">Preventive Assistant</Link></li>
              <li><Link href="/community" className="block px-3 py-2 rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 font-semibold">Community & Challenges</Link></li>
            </ul>
          </nav>
          <div className="mt-auto">
            <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/' }} className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Logout</button>
          </div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)]">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 mb-8 shadow-lg w-full">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name || 'User'}!</h1>
              <p className="text-blue-100 text-lg">This is your Dashboard. Select a section to continue.</p>
            </div>
            <div className="flex gap-6 items-center">
              {/* Circular stat charts */}
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray={`${Math.round((user?.age || 30) % 100)}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{Math.round((user?.age || 30) % 100)}%</span>
                  </div>
                </div>
                <div className="text-sm font-semibold">Risk</div>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray={`${Math.min(100, Math.max(0, Math.round((user?.height || 170) % 50) * 2))}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{Math.max(0, Math.round((user?.height || 170) % 50))}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold">Workouts</div>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray={`${Math.min(100, Math.max(0, Math.round((user?.weight || 70) * 12) / 20))}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{Math.max(0, Math.round((user?.weight || 70) * 12))}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold">Calories</div>
              </div>
            </div>
          </div>
        </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link href="/dashboard/profile" className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">My Profile</h3>
            <p className="text-gray-600">View personal information & health details</p>
          </Link>

          <Link href="/dashboard/schedule" className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule & To-Do</h3>
            <p className="text-gray-600">Manage daily tasks and wellness goals</p>
          </Link>

          <Link href="/dashboard/doctor-consultation" className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">👨‍⚕️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Doctor Consultation</h3>
            <p className="text-gray-600">Book consultations with healthcare experts</p>
          </Link>
          <Link href="/dashboard/risk" className="bg-gradient-to-br from-red-100 to-red-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Risk Forecast</h3>
            <p className="text-gray-600">Predict future health trajectory and explore what-if scenarios</p>
          </Link>

            <Link href="/dashboard/workout" className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">🏋️‍♀️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Workout Plans</h3>
            <p className="text-gray-600">Personalized workout plans, track progress and adapt recommendations</p>
          </Link>

          <Link href="/dashboard/nutrition" className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">🥗</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nutrition</h3>
            <p className="text-gray-600">Food recognition, nutritional summary, and personalized recommendations</p>
          </Link>

          <Link href="/dashboard/preventive-assistant" className="bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 transition transform cursor-pointer">
            <div className="text-4xl mb-4">⚕️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Preventive Assistant</h3>
            <p className="text-gray-600">Early warning alerts and daily preventive tasks tailored to your profile</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/log-workout" className="py-3 px-4 bg-blue-600 text-white rounded-lg text-center">Log Workout</Link>
            <button onClick={() => { setChatOpen(true); setChatInitialQuery(undefined); }} className="py-3 px-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-center shadow hover:scale-105 transform transition">Chat with AI</button>
            <button onClick={() => { setChatOpen(true); setChatInitialQuery('Explain HealthSphere: core purpose, main features, target users, and limitations succinctly.'); }} className="py-3 px-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg text-center shadow hover:scale-105 transform transition">Explain HealthSphere</button>
            <Link href="/dashboard/nutrition" className="py-3 px-4 bg-cyan-600 text-white rounded-lg text-center">Nutrition</Link>
            <Link href="/dashboard/preventive-assistant" className="py-3 px-4 bg-teal-600 text-white rounded-lg text-center">Assistant</Link>
            {user?.medical_report_url ? (
              <div className="flex flex-col items-center">
                <a href={user.medical_report_url} className="py-3 px-4 bg-purple-600 text-white rounded-lg text-center" target="_blank" rel="noopener noreferrer">View Report</a>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold bg-white/10 text-black px-2 py-1 rounded">Uploaded</span>
                  {user?.medical_report_uploaded_at && <span className="text-xs text-black">{new Date(user.medical_report_uploaded_at).toLocaleDateString()}</span>}
                </div>
              </div>
            ) : (
              <Link href="/dashboard/profile" className="py-3 px-4 bg-purple-600 text-white rounded-lg text-center">Upload Report</Link>
            )}
          </div>
        </div>

        {/* Report summary card */}
        {user?.medical_report_url && (
          <div className="mt-6">
            <ReportSummaryCard processingResult={user.processing_result} reportUrl={user.medical_report_url} user={user} onReprocessed={(newRes) => setUser(prev => prev ? ({ ...prev, processing_result: newRes }) : prev)} />
          </div>
        )}
        {chatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-50" onClick={() => setChatOpen(false)} />
            <div className="relative w-full max-w-3xl mx-4">
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">AI Assistant</h3>
                  <button onClick={() => setChatOpen(false)} className="px-3 py-1 rounded text-gray-600 hover:bg-gray-50">Close</button>
                </div>
                <Chatbot premiumOnly={true} initialQuery={chatInitialQuery} autoSend={Boolean(chatInitialQuery)} />
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
      <DashboardFooter />
    </div>
  );
}
