"use client";
import React, { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';
import PreventiveAssistant from '../../../components/PreventiveAssistant';
import WarningCard from '../../../components/WarningCard';
import ProgressBar from '../../../components/ProgressBar';

export default function DashboardPreventiveAssistantPage() {
  const [tasks, setTasks] = useState<Array<{ id: number; text: string; done: boolean }>>([
    { id: 1, text: 'Take a short 10-minute walk', done: false },
    { id: 2, text: 'Reduce sodium in next meal', done: false },
    { id: 3, text: 'Add a serving of vegetables', done: false },
  ]);

  const [alerts] = useState<Array<any>>([
    { type: 'diet', severity: 'medium', message: 'High sodium intake detected', recommendation: 'Reduce salt and choose low-sodium options', related_data: {} },
    { type: 'exercise', severity: 'low', message: 'Inactivity trend', recommendation: 'Try a daily 15-min walk', related_data: {} },
  ]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Preventive Assistant" showBack={true} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Preventive Health Assistant</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <PreventiveAssistant />
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Today&apos;s Alerts</h4>
              <div className="space-y-3">
                {alerts.map((a, i) => <WarningCard key={i} warning={a} />)}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Daily Tasks</h4>
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <input type="checkbox" checked={t.done} onChange={() => setTasks(prev => prev.map(p => p.id === t.id ? { ...p, done: !p.done } : p))} className="w-4 h-4" />
                    <div className={t.done ? 'line-through text-gray-500' : 'text-gray-800'}>{t.text}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Risk Snapshot</h4>
              <div className="mb-2 text-sm text-gray-700">Overall risk for next 30 days</div>
              <ProgressBar progress={40} />
            </div>
          </div>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
