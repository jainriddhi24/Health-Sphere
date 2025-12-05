import React from 'react';
import PreventiveAssistant from '../../components/PreventiveAssistant';

export default function PreventiveAssistantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Preventive Health Assistant</h1>
        <div className="text-sm text-gray-600 mb-6">Receive personalized early alerts and actionable daily tasks to reduce your health risks. Keep this profile up to date for the most relevant advice.</div>
        <PreventiveAssistant />
      </div>
    </div>
  );
}
