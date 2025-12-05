"use client";
import React, { useState } from 'react';
import API from '@/lib/api/axios';
import Notification from './Notification';

type Source = string | { id?: string; text?: string; [key: string]: unknown };

type DangerFlag = {
  name: string;
  value: string | number;
  range?: string;
  [key: string]: unknown;
};

type Metadata = {
  danger_flags?: DangerFlag[];
  extracted_fields?: string[];
  issues?: string[];
  [key: string]: unknown;
};

type ProcessingResult = {
  text?: string;
  summary?: string;
  diagnosis?: string;
  patient_name?: string;
  diet_plan?: string[];
  sources?: Source[];
  lab_values?: Array<{ parameter: string; value: string | number; unit: string; field: string }>;
  metadata?: Metadata;
  used_api?: boolean;
  model?: string;
};

type UserInfo = {
  id?: string;
  name?: string;
  email?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  created_at?: string;
};

export default function ReportSummaryCard({ processingResult, reportUrl, user, onReprocessed }: { processingResult?: ProcessingResult | null | string; reportUrl?: string | null; user?: UserInfo | null; onReprocessed?: (newResult: ProcessingResult) => void }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reprocess = async () => {
    setProcessing(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await API.post('/report/process', {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res?.data) {
        if (onReprocessed) onReprocessed(res.data as ProcessingResult);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> }; message?: string };
      const data = e?.response?.data as unknown;
      // Accept both { error: '...' } and FastAPI { detail: { error: '...' } } shapes
      const extractApiError = (d: unknown): unknown => {
        if (!d || typeof d !== 'object') return d;
        const record = d as Record<string, unknown>;
        if (typeof record['error'] === 'string') return record['error'];
        if (record['detail']) {
          const detail = record['detail'];
          if (typeof detail === 'string') return detail;
          if (typeof detail === 'object' && detail !== null) {
            const dd = detail as Record<string, unknown>;
            if (typeof dd['error'] === 'string') return dd['error'];
            if (typeof dd['traceback'] === 'string') return dd['traceback'];
            return dd;
          }
        }
        return record;
      };
      const apiError = extractApiError(data);
      const errorMsg = typeof apiError === 'string' ? apiError : e?.message || 'Failed to reprocess report';
      let detailedError = '';
      if (typeof apiError === 'string') {
        detailedError = apiError;
      } else if (typeof apiError === 'object' && apiError !== null) {
        const rec = apiError as Record<string, unknown>;
        if (typeof rec['error'] === 'string') detailedError = rec['error'] as string;
        // Surface verification issues from the model (e.g., 422 from ML)
        else if (Array.isArray(rec['issues'])) {
          const issuesArr = rec['issues'] as unknown[];
          detailedError = `Model verification issues: ${issuesArr.map(i => (typeof i === 'string' ? i : JSON.stringify(i))).join(', ')}`;
        }
        // Include a short part of traceback if provided (debug mode)
        else if (typeof rec['traceback'] === 'string') {
          detailedError = `${rec['error'] ?? 'Server error'}. Trace: ${String(rec['traceback']).split('\n').slice(0,2).join(' | ')}`;
        }
        else detailedError = JSON.stringify(apiError);
      } else {
        detailedError = JSON.stringify(apiError);
      }
      console.warn('Reprocess failed', detailedError || errorMsg);
      setError(detailedError);
    } finally {
      setProcessing(false);
    }
  };

  let resultObj: ProcessingResult | null = null;
  if (!processingResult) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Report summary</h3>
        <p className="text-sm text-black-600">No processed report found. If you have uploaded a medical report, use the <strong>Process</strong> action to get an AI-generated summary and diet plan.</p>
        <div className="mt-3 flex gap-2">
          {reportUrl ? <a href={reportUrl} className="px-3 py-2 bg-purple-600 text-white rounded">View Report</a> : null}
          <button onClick={reprocess} disabled={processing} className="px-3 py-2 bg-blue-600 text-white rounded">{processing ? 'Processing…' : 'Process'}</button>
        </div>
        {error && <Notification message={error} type="error" onClose={() => setError(null)} />}
      </div>
    );
  }

  try {
    if (typeof processingResult === 'string') resultObj = JSON.parse(processingResult);
    else resultObj = processingResult as ProcessingResult;
  } catch {
    resultObj = processingResult as ProcessingResult;
  }
  const { summary, diagnosis, patient_name, diet_plan, sources, metadata, lab_values } = resultObj || {};
  
  // Debug log to see what we're getting
  if (processingResult) {
    console.log('[ReportSummaryCard] Processing result:', { summary, diagnosis, patient_name, diet_plan, has_lab_values: !!lab_values, has_metadata: !!metadata });
  }
  
  // Extract report filename from URL
  const reportFilename = reportUrl ? reportUrl.split('/').pop()?.replace(/^[0-9a-f]{32}\//, '') || reportUrl : null;

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-black font-semibold mb-1">Clinical Report Intelligence</h2>
          <p className="text-sm text-gray-600">AI-generated summary and evidence-based diet personalization for your uploaded report.</p>
        </div>
        <div className="flex gap-2 items-center">
          {reportUrl && <a href={reportUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-purple-600 text-white rounded text-sm">View report</a>}
          <button onClick={reprocess} disabled={processing} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{processing ? 'Processing…' : 'Reprocess'}</button>
        </div>
      </div>

      {(summary || diagnosis || patient_name || user) && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="font-semibold text-gray-900 mb-3 text-lg">📋 Clinical Summary & Patient Overview</div>
          
          {reportFilename && (
            <div className="mb-3 p-2 bg-indigo-100 rounded">
              <div className="text-sm text-indigo-900"><span className="font-medium">📄 Report:</span> {reportFilename}</div>
            </div>
          )}
          
          {(patient_name || user?.name) && (
            <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded border border-yellow-100">
              <div className="font-medium text-orange-900 mb-2">👨‍⚕️ Patient Name</div>
              <div className="text-lg font-bold text-orange-900">{patient_name || user?.name}</div>
              <div className="text-xs text-orange-700 mt-1">{patient_name && user?.name && patient_name !== user.name ? `(Database: ${user.name})` : ''}</div>
            </div>
          )}
          
          {user && (
            <div className="mb-4 p-3 bg-white rounded border border-blue-50">
              <div className="font-medium text-gray-800 mb-2">👤 Patient Information</div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                {user.age && <div><span className="font-medium">Age:</span> {user.age} years</div>}
                {user.gender && <div><span className="font-medium">Gender:</span> {user.gender}</div>}
                {user.email && <div><span className="font-medium">Email:</span> {user.email}</div>}
                {user.height && <div><span className="font-medium">Height:</span> {user.height} cm</div>}
                {user.weight && <div><span className="font-medium">Weight:</span> {user.weight} kg</div>}
              </div>
            </div>
          )}
          
          {diagnosis && (
            <div className="mb-4 p-3 bg-red-50 rounded border border-red-100">
              <div className="font-medium text-red-900 mb-2">🔴 Medical Diagnosis</div>
              <div className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap">{diagnosis}</div>
            </div>
          )}
          
          {summary && (
            <div className="mb-4 p-3 bg-white rounded border border-blue-50">
              <div className="font-medium text-gray-800 mb-2">📝 AI Analysis & Clinical Summary</div>
              <div className="text-sm text-gray-800 leading-relaxed">
                {summary.split('\n\n').map((section, idx) => {
                  const lines = section.split('\n');
                  return (
                    <div key={idx} className="mb-3">
                      {lines.map((line, lineIdx) => {
                        // Check if this line is a header (ends with colon)
                        const isHeader = line.trim().endsWith(':');
                        return (
                          <div key={lineIdx} className={isHeader ? "font-semibold text-gray-900 mb-1 mt-2" : "text-gray-800"}>
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {!summary && (diagnosis || patient_name) && (
            <div className="p-3 bg-white rounded border border-yellow-100">
              <div className="text-sm text-yellow-800">ℹ️ Detailed clinical summary processing... Lab values and patient information are shown below.</div>
            </div>
          )}
        </div>
      )}

      {metadata?.extracted_fields && Array.isArray(metadata.extracted_fields) && metadata.extracted_fields.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <div className="font-medium text-blue-900 mb-2">Extracted Medical Fields</div>
          <div className="text-xs text-blue-800 flex flex-wrap gap-2">
            {metadata.extracted_fields.map((field: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-blue-200 rounded">{field}</span>
            ))}
          </div>
        </div>
      )}

      {lab_values && lab_values.length > 0 && (
        <div className="mt-4">
          <div className="font-medium mb-2">Lab Values</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Parameter</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Value</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Unit</th>
                </tr>
              </thead>
              <tbody>
                {lab_values.map((lab, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{lab.parameter}</td>
                    <td className="px-3 py-2 text-center font-medium text-gray-900">{lab.value}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{lab.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diet_plan && diet_plan.length > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
          <div className="font-semibold text-gray-900 mb-3 text-lg">🥗 Recommended Diet Plan</div>
          <div className="bg-white rounded border border-green-100 p-3">
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
              {diet_plan.map((d, i) => (
                <li key={i} className="text-green-800 font-medium">{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {metadata?.danger_flags && metadata.danger_flags.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded">
          <div className="font-medium text-red-700">Urgent lab values detected</div>
          <div className="text-sm text-red-700 mt-1">{metadata.danger_flags.map((f: DangerFlag) => `${f.name}: ${f.value} (${f.range ?? '—'})`).join(', ')}</div>
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          <div className="font-medium">Sources</div>
          <div>{sources.map(s => (typeof s === 'string' ? s : s.text || s.id || JSON.stringify(s))).join(', ')}</div>
        </div>
      )}

      {error && <div className="mt-3"><Notification message={error} type="error" onClose={() => setError(null)} /></div>}
    </div>
  );
}
