import React from 'react';

export default function WarningCard({ warning }: { warning: any }) {
  const { type, severity, message, recommendation } = warning;
  const severityColor = severity === 'critical' ? 'border-red-400 bg-red-50 text-red-700' : (severity === 'high' ? 'border-orange-400 bg-orange-50 text-orange-700' : (severity === 'medium' ? 'border-yellow-300 bg-yellow-50 text-yellow-900' : 'border-green-400 bg-green-50 text-green-900'));

  return (
    <div className={`p-3 border-l-4 rounded ${severityColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium">{type}</div>
          <div className="text-xs text-gray-500">severity: {severity}</div>
        </div>
      </div>
      <div className="text-sm mt-2">{message}</div>
      <div className="text-sm mt-2 font-medium">Recommendation:</div>
      <div className="text-sm">{recommendation}</div>
    </div>
  );
}
