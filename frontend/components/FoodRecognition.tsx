"use client";
import { useState, ChangeEvent } from 'react';
import API from '../lib/api/axios';
import ProgressBar from './ProgressBar';
import Notification from './Notification';

type Candidate = { label: string; confidence: number };

type RecognitionResult = {
  meal_label: string;
  calories: number;
  sodium: number;
  sugar: number;
  unhealthy_score: number;
  confidence: number;
  candidates?: Candidate[];
};

export default function FoodRecognition({ onResult, userProfile }: { onResult?: (r: RecognitionResult | null) => void; userProfile?: Record<string, unknown> }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chronicConditionText = String(userProfile?.chronic_condition ?? '');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const upload = async () => {
    if (!file) return setError('Please select an image');
    setLoading(true);
    setError(null);
    setResult(null);

    // Two attempts: initial and a single retry for 503/timeouts
    try {
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await API.post('/food/scan', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const data = res.data as RecognitionResult;
        setResult(data);
        onResult?.(data);
        lastErr = null;
        break; // success
      } catch (uploadErr) {
        lastErr = uploadErr;
        const e = uploadErr as { response?: { status?: number; data?: any }; code?: string } | undefined;
        if (attempt === 0 && (e?.response?.status === 503 || e?.code === 'ECONNABORTED')) {
          // retry after a short delay
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        // On last attempt or non-retryable error, handle below
        break;
      }
    }
      if (lastErr) {
      const e = lastErr as { response?: { status?: number; data?: any }; code?: string } | undefined;
      if (e?.response?.status === 501) {
        setError('Food recognition is not available yet on the server. This is a stubbed UI.');
      } else if (e?.response?.status === 404) {
        setError('Food recognition endpoint not found on server (404). Make sure the backend route and ML service are running.');
      } else if (e?.response?.status === 503) {
        setError('Food recognition service is currently unavailable (ML service unreachable).');
      } else if (e?.code === 'ECONNABORTED') {
        setError('Request timed out while contacting the ML service.');
      } else {
        const message = (e?.response?.data?.error) || (e as any)?.message || 'An error occurred while trying to recognize the image.';
        setError(message);
      }
      }
    } catch (err: unknown) {
      console.warn(err);
      const e = err as { response?: { status?: number; data?: any }; code?: string } | undefined;
      if (e?.response?.status === 501) {
        setError('Food recognition is not available yet on the server. This is a stubbed UI.');
      } else if (e?.response?.status === 404) {
        setError('Food recognition endpoint not found on server (404). Make sure the backend route and ML service are running.');
      } else if (e?.response?.status === 503) {
        setError('Food recognition service is currently unavailable (ML service unreachable).');
      } else if (e?.code === 'ECONNABORTED') {
        setError('Request timed out while contacting the ML service.');
      } else {
        const message = (e?.response?.data?.error) || (e as any)?.message || 'An error occurred while trying to recognize the image.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/food/test');
      const data = res.data as RecognitionResult;
      setResult(data);
      onResult?.(data);
    } catch (err) {
      console.warn('Quick test failed', err);
      const e = err as { response?: { status?: number; data?: any }; code?: string } | undefined;
      if (e?.response?.status === 503) {
        setError('ML service is currently unreachable. Start the ML service and try again.');
      } else {
        setError((e?.response?.data?.error) || 'Quick test failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    onResult?.(null);
    setError(null);
  };

  // Demo helper: populate with mock data for testing before API implementation
  const useMock = () => {
    const mock: RecognitionResult = {
      meal_label: 'Pizza',
      calories: 350,
      sodium: 900,
      sugar: 8,
      unhealthy_score: 65,
      confidence: 0.82,
    };
    setResult(mock);
    onResult?.(mock);
  };

  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState('');
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

  const submitCorrection = async () => {
    if (!result) return;
    const corrected_label = correction || (selectedCandidateIndex !== null && result.candidates ? result.candidates[selectedCandidateIndex].label : result.meal_label);
    // Optimistically update UI
    setResult({ ...result, meal_label: corrected_label });
    setShowCorrection(false);

    try {
      await API.post('/food/feedback', {
        original_label: result.meal_label,
        corrected_label,
        confidence: result.confidence,
        image_path: previewUrl || undefined,
      });
    } catch (fbErr) {
      console.warn('Failed to send feedback', fbErr);
      // Show non-blocking notification
    }
  };

  return (
    <div className="p-0">
      {/* Removal of inner spacing; parent page will wrap this component in card now */}
      <h2 className="text-xl font-semibold mb-4">Food Recognition & Nutrition</h2>
      <div className="text-sm text-gray-600 mb-4">Upload a clear photo of your meal and get a quick estimate of calories, sodium, and sugar. Results will be personalized to your health profile if available.</div>

      {error && <Notification message={error} type="error" onClose={() => setError(null)} />}

      <div className="mb-4">
        {chronicConditionText && (
          <div className="text-sm text-gray-600 mb-2">Personalized suggestions for condition: <span className="font-semibold">{chronicConditionText}</span></div>
        )}
        <label className="block mb-1 font-medium">Upload food image</label>
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={handleFileChange} className="p-2 border border-gray-300 rounded bg-gray-50 text-gray-900 text-sm" />
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={upload} disabled={loading || !file}>
            {loading ? 'Recognizing...' : 'Recognize'}
          </button>
          <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onClick={clear}>
            Clear
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200" onClick={useMock} title="Populate mock result">Use mock result</button>
          <button className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600" onClick={quickTest} disabled={loading}>Quick test</button>
        </div>
      </div>

      {previewUrl && (
        <div className="mb-6">
          <div className="mb-1 font-medium">Preview</div>
          {/* Use next/image for optimized images. We still allow external previews via URL.createObjectURL. */}
          <div className="relative w-48 h-48">
            {/* raw object URL preview is commonly used during uploads; using a standard <img> is safe here */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? ''} alt="preview" className="rounded border object-cover w-48 h-48" />
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-4">
            <div>
              <h3 className="text-lg font-medium">Detected</h3>
              <div className="text-gray-700">{result.meal_label} <span className="text-sm text-gray-500">(confidence {(result.confidence * 100).toFixed(0)}%)</span></div>
            </div>
            <div className="w-1/3">
              <div className="text-sm text-gray-600 mb-1">Unhealthy score</div>
              <ProgressBar progress={Math.round(result.unhealthy_score)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Calories</div>
              <div className="text-xl font-semibold">{result.calories} kcal</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Sodium</div>
              <div className="text-xl font-semibold">{result.sodium} mg</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Sugar</div>
              <div className="text-xl font-semibold">{result.sugar} g</div>
            </div>
          </div>
          {result.candidates && result.candidates.length > 0 && (
            <div className="mt-3 text-sm">
              <div className="text-xs text-gray-600 mb-1">Other suggestions</div>
              <div className="flex gap-2 flex-wrap">
                {result.candidates.map((c, idx) => (
                  <button key={idx} onClick={() => setSelectedCandidateIndex(idx)} className={`px-2 py-1 border rounded ${selectedCandidateIndex === idx ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                    {c.label} ({Math.round(c.confidence * 100)}%)
                  </button>
                ))}
                <button onClick={() => setShowCorrection(true)} className="px-2 py-1 border rounded border-red-200 text-red-600">This is wrong</button>
              </div>
            </div>
          )}
          {showCorrection && (
            <div className="mt-3 space-y-2">
              <div className="text-sm">Select a suggestion or enter the correct label</div>
              <div className="flex gap-2">
                <input value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="Enter correct label" className="p-2 border rounded w-full" />
                <button onClick={submitCorrection} className="px-3 py-1 bg-green-600 text-white rounded">Submit</button>
                <button onClick={() => { setShowCorrection(false); setCorrection(''); setSelectedCandidateIndex(null); }} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">Tip: Use a well-lit image and show only the plate for better detection.</div>
    </div>
  );
}
