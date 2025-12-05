"use client";
import React, { useState } from 'react';
import API from '@/lib/api/axios';

type Scenario = {
  id: string;
  label: string;
  weightDelta?: number; // kg change
  activityMultiplier?: number; // -1..1 where negative improves
  color?: string;
  data?: number[]; // precomputed forecast for the scenario
}

export function simulateScenario(baseForecast: number[], scenario: { weightDelta?: number; activityMultiplier?: number }) {
  const { weightDelta = 0, activityMultiplier = 0 } = scenario;
  // apply a transform: weightDelta increases risk by some factor and activity reduces
  return baseForecast.map((v, i) => Math.max(0, Math.min(100, Math.round(v + (weightDelta * 0.6) + (i * -0.2 * activityMultiplier)))));
}

export default function WhatIfSimulation({ baseForecast, onApply }: { baseForecast: number[]; onApply?: (alt: { label: string; data: number[]; color?: string }[]) => void }) {
  const [weightDelta, setWeightDelta] = useState(0);
  const [activity, setActivity] = useState(0); // -2..2
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  const addScenario = async () => {
    // If editing, update the existing scenario instead
    const label = `Weight ${weightDelta >= 0 ? '+' : ''}${weightDelta} kg • Act ${activity}`;
    const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    if (editingId) {
      setScenarios(prev => {
        const newScenarios = prev.map(s => {
          if (s.id !== editingId) return s;
          const updated = {
            ...s,
            label,
            weightDelta,
            activityMultiplier: activity,
            color: s.color || color,
            data: simulateScenario(baseForecast, { weightDelta, activityMultiplier: activity }),
          } as Scenario;
          return updated;
        });
        onApply?.(newScenarios.map(s => ({ label: s.label, data: s.data ?? simulateScenario(baseForecast, s), color: s.color })));
        return newScenarios;
      });
      setEditingId(null);
      return;
    }

    // Create a new scenario
    const s: Scenario = { id: `${Date.now()}-${Math.floor(Math.random()*1000)}`, label, weightDelta, activityMultiplier: activity, color, data: undefined };
    // Try to compute on server first
    setServerLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const payload = { scenarios: [{ weightDelta: s.weightDelta, activityMultiplier: s.activityMultiplier }], baseForecast };
      if (token) {
        const resp = await API.post('/risk/simulate', payload, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        if (resp && resp.data && Array.isArray(resp.data?.data?.forecasts)) {
          // Expect server returns { forecasts: [ [..] ] }
          s.data = resp.data.data.forecasts[0];
        } else {
          // fallback compute locally
          s.data = simulateScenario(baseForecast, s);
        }
      } else {
        s.data = simulateScenario(baseForecast, s);
      }
    } catch (err) {
      console.warn('Simulation API failed, using local sim', err);
      s.data = simulateScenario(baseForecast, s);
    } finally {
      setServerLoading(false);
    }

    const newScenarios = [...scenarios, s];
    setScenarios(newScenarios);
    onApply?.(newScenarios.map((s) => ({ label: s.label, data: s.data ?? simulateScenario(baseForecast, s), color: s.color })));
  };

  const clear = () => {
    setScenarios([]);
    setEditingId(null);
    onApply?.([]);
  };

  const removeScenario = (id: string) => {
    const newScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(newScenarios);
    onApply?.(newScenarios.map(s => ({ label: s.label, data: s.data ?? simulateScenario(baseForecast, s), color: s.color })));
  };

  const editScenario = (id: string) => {
    const s = scenarios.find(x => x.id === id);
    if (!s) return;
    setWeightDelta(s.weightDelta ?? 0);
    setActivity(s.activityMultiplier ?? 0);
    setEditingId(id);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h4 className="text-sm font-semibold text-gray-900">What-if simulation</h4>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Weight delta (kg)</label>
          <input type="range" min={-10} max={10} step={0.5} value={weightDelta} onChange={(e) => setWeightDelta(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{weightDelta >= 0 ? `+${weightDelta}` : weightDelta} kg</div>
        </div>
        <div>
          <label className="text-xs text-gray-600">Activity shift</label>
          <input type="range" min={-2} max={2} step={0.25} value={activity} onChange={(e) => setActivity(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600 mt-1">{activity < 0 ? 'More active' : activity > 0 ? 'Less active' : 'No change'}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <button className={"bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2 " + (serverLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700')} onClick={addScenario} disabled={serverLoading}>
          {serverLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Simulating…
            </>
          ) : (<>Add scenario</>)}
        </button>
        <button className="bg-gray-200 px-3 py-1 rounded text-gray-700" onClick={clear} disabled={serverLoading}>Clear</button>
      </div>

      <div className="mt-3 text-sm text-gray-600">
            {scenarios.length ? (
          <ul className="space-y-2">
            {scenarios.map((s) => (
              <li key={s.id} className="text-xs flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, backgroundColor: s.color, display: 'inline-block', borderRadius: 3 }}></span>
                  <div>{s.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button title="Edit" className="text-xs text-blue-700 hover:underline" onClick={() => editScenario(s.id)}>Edit</button>
                  <button title="Remove" className="text-xs text-red-600 hover:underline" onClick={() => removeScenario(s.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <div>No scenarios yet. Adjust sliders and tap Add scenario to compare trends.</div>}
      </div>
    </div>
  );
}
