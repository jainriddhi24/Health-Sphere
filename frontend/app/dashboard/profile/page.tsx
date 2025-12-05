"use client";

import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';
import API from "@/lib/api/axios";
import Notification from "@/components/Notification";
import ProgressBar from "@/components/ProgressBar";
import { AxiosProgressEvent } from 'axios';
import ConfirmModal from "@/components/ConfirmModal";

interface Lifestyle {
  smoking: boolean;
  alcohol: boolean;
  activity_level: 'low' | 'medium' | 'high';
  diet?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  created_at?: string;
  chronic_condition?: string;
  lifestyle?: Lifestyle;
  personal_goals?: string[];
  medical_report_url?: string;
  medical_report_uploaded_at?: string | null;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<{ summary?: string; diet_plan?: string[]; text?: string; confidence?: number; metadata?: any } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const extractMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
      const e = error as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string };
      return e.response?.data?.message || e.response?.data?.error?.message || e.message || null;
    }
    return null;
  };
  const getFileName = (urlOrFilename?: string) => {
    if (!urlOrFilename) return '';
    try {
      // Try parsing if it's a full URL
      if (urlOrFilename.startsWith('http://') || urlOrFilename.startsWith('https://')) {
        const u = new URL(urlOrFilename);
        return u.pathname.split('/').pop() || urlOrFilename;
      }
    } catch { /* ignore */ }
    // fallback split
    const parts = urlOrFilename.split(/[\\/]/);
    return parts[parts.length - 1];
  };
  const [formState, setFormState] = useState<{
    name: string;
    age: string;
    gender: string;
    height: string;
    weight: string;
    chronic_condition: string;
    lifestyle: Lifestyle;
    personal_goals: string[];
    medicalReportFile: File | null;
  }>({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    chronic_condition: "none",
    lifestyle: {
      smoking: false,
      alcohol: false,
      activity_level: "medium",
      diet: "",
    },
    personal_goals: [] as string[],
    medicalReportFile: null as File | null,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return window.location.assign("/login");

        const res = await API.get("/auth/profile", { headers: { Authorization: `Bearer ${token}` } });
        setUserData(res.data.data);
        if (res.data?.data?.user?.processing_result) {
          setProcessingResult(res.data.data.user.processing_result);
        }
        const data = res.data.data;
        setFormState(prev => ({
          ...prev,
          name: data.name || "",
          age: data.age ? String(data.age) : "",
          gender: data.gender || "",
          height: data.height ? String(data.height) : "",
          weight: data.weight ? String(data.weight) : "",
          chronic_condition: data.chronic_condition || "none",
          lifestyle: data.lifestyle || prev.lifestyle,
          personal_goals: data.personal_goals || [],
        }));
      } catch (err) {
        console.warn(err);
        localStorage.removeItem("token");
        window.location.assign("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const { name, value } = target;
    const type = (target as HTMLInputElement).type;
    if (name.startsWith("lifestyle.")) {
      const key = name.split(".")[1];
      setFormState(prev => ({ ...prev, lifestyle: { ...prev.lifestyle, [key]: type === "checkbox" ? (target as HTMLInputElement).checked : value } }));
      return;
    }
    if (name === "personal_goals") {
      const arr = (target as HTMLTextAreaElement).value.split("\n").map(s => s.trim()).filter(Boolean);
      setFormState(prev => ({ ...prev, personal_goals: arr }));
      return;
    }
    if (type === "checkbox") {
      if ('checked' in target) {
        setFormState(prev => ({ ...prev, [name]: (target as HTMLInputElement).checked }));
      }
      return;
    }
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFormState(prev => ({ ...prev, medicalReportFile: e.target.files![0] }));
    // If the user is not in edit mode but chose a report through upload button, auto-submit upload
    if (e.target.files && e.target.files.length > 0) {
      // Submit only the file for quick upload
      (async () => {
        setSubmitting(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
          const token = localStorage.getItem("token");
          if (!token) throw new Error("Not authenticated");
          const fd = new FormData();
          fd.append("medical_report", e.target.files![0]);
          // Use AbortController and measure upload speed
          const controller = new AbortController();
          abortControllerRef.current = controller;
          const startTime = Date.now();
          setIsUploading(true);
          setUploadProgress(0);
          setUploadSpeed(null);
          const res = await API.put("/auth/profile", fd, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            const loaded = progressEvent?.loaded ?? 0;
            const total = progressEvent?.total ?? 0;
            const pct = Math.round((loaded * 100) / (total || 1));
            setUploadProgress(pct);
            const now = Date.now();
            const secs = Math.max(0.001, (now - startTime) / 1000);
            const kbPerSec = (loaded / 1024) / secs;
            setUploadSpeed(kbPerSec);
          } });
            if (res.data && res.data.data && res.data.data.user) {
            setUserData(res.data.data.user);
            setFormState(prev => ({ ...prev, medicalReportFile: null }));
              // Update processing result if returned from server
              if (res.data.data.processing) {
                setProcessingResult(res.data.data.processing as any);
              } else {
                setProcessingResult(null);
              }
            // Notify other parts of the app to refresh their cached profile
            try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: res.data.data.user })); } catch { }
            setEditing(false);
            const msg = res.data.message || "Report uploaded successfully.";
            if (msg.toLowerCase().includes('not saved')) {
              setErrorMsg(msg);
              setTimeout(() => setErrorMsg(null), 3500);
            } else {
              setSuccessMsg(msg);
              setTimeout(() => setSuccessMsg(null), 3500);
            }
            setTimeout(() => setSuccessMsg(null), 3500);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadSpeed(null);
            abortControllerRef.current = null;
          }
        } catch (err: unknown) {
          console.warn('Upload error:', err);
          // Try to show server response to aid debugging
          try {
            const e = err as { response?: { data?: any } };
            console.warn('Upload server response:', e.response?.data);
          } catch (e) {
            // ignore
          }
          const error = err as { name?: string; code?: string };
          if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
            setErrorMsg('Upload canceled.');
          } else {
            setErrorMsg(extractMessage(err) ?? "Failed to upload report. Please try again.");
          }
          setTimeout(() => setErrorMsg(null), 3500);
        } finally {
          setSubmitting(false);
        }
      })();
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadSpeed(null);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const fd = new FormData();
      if (formState.name) fd.append("name", formState.name);
      if (formState.age) fd.append("age", formState.age);
      if (formState.gender) fd.append("gender", formState.gender);
      if (formState.height) fd.append("height", formState.height);
      if (formState.weight) fd.append("weight", formState.weight);
      if (formState.chronic_condition) fd.append("chronic_condition", formState.chronic_condition);
      fd.append("lifestyle", JSON.stringify(formState.lifestyle));
      if (formState.personal_goals && formState.personal_goals.length) fd.append("personal_goals", formState.personal_goals.join(","));
      if (formState.medicalReportFile) fd.append("medical_report", formState.medicalReportFile);

      const res = await API.put("/auth/profile", fd, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.data && res.data.data.user) {
        setUserData(res.data.data.user);
        setFormState(prev => ({ ...prev, medicalReportFile: null }));
        setEditing(false);
        const msg = res.data.message || "Profile updated successfully.";
        if (msg.toLowerCase().includes('not saved')) {
          setErrorMsg(msg);
          setTimeout(()=>setErrorMsg(null), 3500);
        } else {
          setSuccessMsg(msg);
          setTimeout(()=>setSuccessMsg(null), 3500);
        }
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err) {
      console.warn(err);
      setErrorMsg(extractMessage(err) ?? "Failed to save profile. Please try again.");
      setTimeout(()=>setErrorMsg(null), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async () => {
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await API.delete('/auth/profile/report', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.success) {
        setUserData(res.data.data.user);
        try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: res.data.data.user })); } catch { }
        setShowDeleteModal(false);
        setSuccessMsg('Report deleted successfully.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.warn(err);
      setErrorMsg(extractMessage(err) ?? 'Failed to delete report.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Loading profile...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Profile" showBack={true} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {successMsg && <Notification message={successMsg} type="success" onClose={() => setSuccessMsg(null)} />}
        {errorMsg && <Notification message={errorMsg} type="error" onClose={() => setErrorMsg(null)} />}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">{userData?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{userData?.name}</h1>
              <p className="text-blue-100 text-lg">{userData?.email}</p>
            </div>
          </div>
                {processingResult && (
                  <div className="mt-4 bg-gray-50 border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
                    <p className="text-gray-800 mt-2">{processingResult.summary || processingResult.text}</p>
                    {!!(processingResult.diet_plan && processingResult.diet_plan.length) && (
                      <div className="mt-3">
                        <h4 className="font-medium text-gray-800">Diet Plan</h4>
                        <ul className="list-disc ml-6 mt-2 text-gray-700">
                          {processingResult.diet_plan?.map((d, i) => (<li key={i}>{d}</li>))}
                        </ul>
                      </div>
                    )}
                    {processingResult.confidence && (
                      <p className="text-sm text-gray-600 mt-2">Confidence: {(processingResult.confidence * 100).toFixed(1)}%</p>
                    )}
                  </div>
                )}
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left column - personal */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 font-medium">Full Name</label>
                {!editing ? <p className="text-gray-900 text-lg">{userData?.name}</p> : <input name="name" value={formState.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />}
              </div>
              <div>
                <label className="text-gray-600 font-medium">Email Address</label>
                <p className="text-gray-900 text-lg">{userData?.email}</p>
              </div>
              <div>
                <label className="text-gray-600 font-medium">Age</label>
                {!editing ? <p className="text-gray-900 text-lg">{userData?.age || 'Not provided'}</p> : <input name="age" value={formState.age} onChange={handleChange} type="number" min={13} max={120} className="w-full px-3 py-2 border rounded-lg" />}
              </div>
              <div>
                <label className="text-gray-600 font-medium">Gender</label>
                {!editing ? <p className="text-gray-900 text-lg capitalize">{userData?.gender || 'Not provided'}</p> : (
                  <select name="gender" value={formState.gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Right column - health */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Health Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 font-medium">Height (cm)</label>
                {!editing ? <p className="text-gray-900 text-lg">{userData?.height ? `${userData.height} cm` : 'Not provided'}</p> : <input name="height" value={formState.height} onChange={handleChange} type="number" className="w-full px-3 py-2 border rounded-lg" />}
              </div>
              <div>
                <label className="text-gray-600 font-medium">Weight (kg)</label>
                {!editing ? <p className="text-gray-900 text-lg">{userData?.weight ? `${userData.weight} kg` : 'Not provided'}</p> : <input name="weight" value={formState.weight} onChange={handleChange} type="number" className="w-full px-3 py-2 border rounded-lg" />}
              </div>
              <div>
                <label className="text-gray-600 font-medium">BMI</label>
                {userData?.height && userData?.weight ? <p className="text-gray-900 text-lg">{(userData.weight / ((userData.height / 100) ** 2)).toFixed(1)}</p> : <p className="text-gray-900 text-lg">Not calculated</p>}
              </div>
              <div>
                <label className="text-gray-600 font-medium">Chronic Condition</label>
                {!editing ? <p className="text-gray-900 text-lg capitalize">{userData?.chronic_condition || 'None'}</p> : (
                  <select name="chronic_condition" value={formState.chronic_condition} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="none">None</option>
                    <option value="diabetes">Diabetes</option>
                    <option value="hypertension">Hypertension</option>
                    <option value="heart_disease">Heart disease</option>
                    <option value="obesity">Obesity</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Additional info: Lifestyle & Medical history */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Lifestyle & Medical History</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="text-gray-600 font-medium">Lifestyle Habits</label>
                <div className="flex gap-4 items-center mt-2">
                  <label className="flex items-center gap-2"><input type="checkbox" name="lifestyle.smoking" checked={formState.lifestyle.smoking} onChange={(e) => handleChange(e)} /> Smoking</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="lifestyle.alcohol" checked={formState.lifestyle.alcohol} onChange={(e) => handleChange(e)} /> Alcohol</label>
                </div>
                <div className="mt-3">
                  <label className="text-gray-600">Activity Level</label>
                  <select name="lifestyle.activity_level" value={formState.lifestyle.activity_level} onChange={(e) => handleChange(e)} className="w-full px-3 py-2 border rounded-lg mt-1">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="mt-3">
                  <label className="text-gray-600">Dietary Notes (optional)</label>
                  <input name="lifestyle.diet" value={formState.lifestyle.diet} onChange={(e) => handleChange(e)} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
              </div>
              <div>
                <label className="text-gray-600 font-medium">Personal Goals</label>
                <textarea name="personal_goals" value={formState.personal_goals.join('\n')} onChange={(e) => handleChange(e)} placeholder="List goals, one per line" className="w-full px-3 py-2 border rounded-lg h-32 mt-2" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <label className="text-gray-900 font-medium">Medical History Report</label>
                <div className="mt-2">
                  {userData?.medical_report_url ? (
                    <div className="flex items-center gap-4">
                      <a href={userData.medical_report_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-medium">View existing report</a>
                      <button type="button" className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700" onClick={async () => {
                        setIsProcessing(true);
                        try {
                          const token = localStorage.getItem('token');
                          if (!token) throw new Error('Not authenticated');
                          const resp = await API.post('/report/process', {}, { headers: { Authorization: `Bearer ${token}` } });
                          if (resp && resp.data) {
                            setProcessingResult(resp.data as any);
                          }
                          } catch (err) {
                          console.warn('Process report error:', err);
                          const msg = extractMessage(err) || 'Failed to process report.';
                          setErrorMsg(msg);
                          setTimeout(() => setErrorMsg(null), 3500);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}>{isProcessing ? 'Processing...' : 'Process'}</button>
                      <button type="button" className="text-sm text-red-600 hover:underline flex items-center gap-2" onClick={() => setShowDeleteModal(true)}>
                        {isDeleting && <svg className="animate-spin h-4 w-4 text-red-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                        Delete
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600">No report uploaded</p>
                  )}
                  {successMsg && userData?.medical_report_url && (
                    <div className="mt-2 text-sm text-gray-700">Uploaded: <a className="text-blue-700 hover:underline" href={userData.medical_report_url} target="_blank" rel="noopener noreferrer">{getFileName(userData.medical_report_url)}</a></div>
                  )}
                  {!successMsg && userData?.medical_report_url && (
                    <div className="mt-2 text-sm text-gray-600">File: <a className="text-blue-600 hover:underline" href={userData.medical_report_url} target="_blank" rel="noopener noreferrer">{getFileName(userData.medical_report_url)}</a></div>
                  )}
                  {userData?.medical_report_uploaded_at && (
                    <div className="mt-1 text-xs text-gray-500">Uploaded on: {new Date(userData.medical_report_uploaded_at).toLocaleString()}</div>
                  )}
                  {/* Files table */}
                  {userData?.medical_report_url && (
                    <div className="mt-4 overflow-x-auto bg-gray-50 p-3 rounded">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="px-2 py-1 text-gray-600">Filename</th>
                            <th className="px-2 py-1 text-gray-600">Uploaded</th>
                            <th className="px-2 py-1 text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="px-2 py-2 text-gray-700">{getFileName(userData.medical_report_url)}</td>
                            <td className="px-2 py-2 text-gray-500">{userData.medical_report_uploaded_at ? new Date(userData.medical_report_uploaded_at).toLocaleString() : '—'}</td>
                            <td className="px-2 py-2">
                                <a className="text-blue-600 hover:underline mr-3" href={userData.medical_report_url} target="_blank" rel="noopener noreferrer">View</a>
                                <button onClick={() => setShowDeleteModal(true)} className="text-red-600 hover:underline mr-3 flex items-center gap-2">
                                  {isDeleting && <svg className="animate-spin h-4 w-4 text-red-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                                  Delete
                                </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div>
                    <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="mt-3" />
                    {formState.medicalReportFile && <div className="mt-2 text-sm text-gray-700">Selected: {formState.medicalReportFile.name}</div>}
                  </div>
                ) : (
                  <div className="mt-3">
                    <button type="button" onClick={() => { setEditing(true); setTimeout(()=>fileRef.current?.click(), 50); }} className="bg-blue-600 text-white px-4 py-2 rounded">Upload / Replace Report</button>
                  </div>
                )}
                {isUploading && (
                  <div className="mt-4">
                    <ProgressBar progress={uploadProgress} />
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-sm text-gray-600">{uploadProgress}%</div>
                      <div className="text-sm text-gray-600">{uploadSpeed ? `${uploadSpeed.toFixed(1)} KB/s` : ''}</div>
                      <button type="button" onClick={cancelUpload} className="text-sm text-gray-700 hover:underline">Cancel Upload</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4 justify-end">
                {!editing ? (
                  <>
                    <button type="button" onClick={() => setEditing(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Edit Profile</button>
                    <button type="button" onClick={handleLogout} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">Logout</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setEditing(false)} className="bg-gray-200 px-6 py-3 rounded-lg">Cancel</button>
                    <button type="submit" disabled={submitting} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">{submitting ? 'Saving...' : 'Save Changes'}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <ConfirmModal
        show={showDeleteModal}
        title="Delete uploaded report"
        message="Are you sure you want to delete your uploaded medical report? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteReport}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
      />
          <DashboardFooter />
    </div>
  );
}
