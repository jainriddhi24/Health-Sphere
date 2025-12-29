"use client";
import React, { useState, useEffect, useRef } from 'react';
import type { AxiosResponse } from 'axios';
import API from '../lib/api/axios';
import ChatMessage from './ChatMessage';

type Message = { role: 'user' | 'assistant'; text: string; sources?: { title?: string; url?: string; relevance?: number }[]; dietPlan?: string[]; metadata?: any };

type UserProfile = { processing_result?: Record<string, unknown> | string | null; premium_unlocked?: boolean; [key: string]: unknown };

type MLResponse = { response: string; sources?: { title?: string; url?: string; relevance?: number }[]; diet_plan?: string[]; confidence?: number; model?: string; metadata?: any };

export default function Chatbot({ premiumOnly = false, initialQuery, autoSend = false }: { premiumOnly?: boolean; initialQuery?: string; autoSend?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Premium feature removed — assistant is available for all users
  const [premiumUnlocked, setPremiumUnlocked] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [useReport, setUseReport] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery);
      if (autoSend) {
        // Small delay to allow component to mount
        setTimeout(() => send(), 100);
      }
    }
  }, [initialQuery, autoSend]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get('/auth/profile');
        if (res?.data?.success) {
          setProfile(res.data.data as UserProfile);
          // If processing_result exists, default to using it in chat
          setUseReport(Boolean(res.data.data?.processing_result));
          setPremiumUnlocked(true); // Make assistant accessible regardless of the DB flag
        }
      } catch (err) {
        console.warn('Failed to fetch profile', err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Add a first greeting from the assistant after we've loaded the profile and only if
  // there aren't any messages already in the conversation
  useEffect(() => {
    if (profile && messages.length === 0) {
      const rawName = (profile as any).name || (profile as any).firstName || 'there';
      const firstName = typeof rawName === 'string' ? rawName.split(' ')[0] : 'there';
      const greeting = { role: 'assistant' as const, text: `Hello ${firstName}! How can I help you today?` };
      setMessages((m) => [...m, greeting]);
    }
  }, [profile]);

  const send = async () => {
    if (!input?.trim()) return;
    // For now, allow testing without premium gating
    setError('');
    const userMsg = { role: 'user' as const, text: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const payload: { query: string; user_profile?: UserProfile | null; allow_processing_result: boolean } = { query: userMsg.text, user_profile: profile, allow_processing_result: Boolean(useReport) };
      const res: AxiosResponse<{ success: boolean; data: MLResponse }> = await API.post('/chatbot/query', payload);
      const data = res.data.data as MLResponse;
      const assistantMsg = { role: 'assistant' as const, text: data.response || 'Sorry, no response', sources: data.sources || [], dietPlan: data.diet_plan || [], model: data.model || 'mock', metadata: data.metadata || null };
      setMessages((m) => [...m, assistantMsg]);
      // If the assistant suggested follow-up questions, display them via messages or interface
      if (assistantMsg.metadata?.follow_up_questions && assistantMsg.metadata.follow_up_questions.length > 0) {
        // We append a small assistant-suggested prompt message (not intrusive)
        const quickText = `I need some additional info: ${assistantMsg.metadata.follow_up_questions.join(' | ')}`;
        setMessages((m) => [...m, { role: 'assistant', text: quickText, metadata: assistantMsg.metadata }]);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Chat error', errMsg);
      setError('Failed to get a response from the assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-5 space-y-4 ring-1 ring-gray-100">
      {/* removed premium gate: the assistant is available to all users */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-400 to-yellow-300 flex items-center justify-center text-2xl shadow">🤖</div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Health Assistant</h2>
            <div className="text-xs text-gray-500">Ask anything about nutrition, workouts or prevention</div>
          </div>
        </div>
        <div className="text-sm text-gray-500">Available</div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 flex items-center gap-2">
          <input type="checkbox" checked={useReport} onChange={(e) => setUseReport(e.target.checked)} className="rounded" />
          <span className="text-xs">Use my uploaded report for personalized answers</span>
        </label>
      </div>
      <div ref={listRef} className="h-72 overflow-auto border rounded-lg p-3 bg-gradient-to-br from-gray-50 to-white">
        {messages.length === 0 && <div className="text-gray-600 italic">Say hi to your assistant — ask for personalized recommendations.</div>}
        {messages.map((m, idx) => (
          <ChatMessage key={idx} role={m.role} sources={m.sources} dietPlan={m.dietPlan} model={(m as any).model}>{m.text}</ChatMessage>
        ))}
        {/* Live preview when user is typing */}
        {input.trim().length > 0 && (
          <div className="mt-1">
            <ChatMessage role="user" showAvatar={false}><span className="text-gray-600/80 italic">{input}</span></ChatMessage>
          </div>
        )}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {/* Render follow-up questions and alerts if assistant provided metadata */}
      {(() => {
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
        if (!lastAssistant || !lastAssistant.metadata) return null;
        const meta = lastAssistant.metadata as any;
        return (
          <div className="mt-2">
            {meta.needs_professional_review && (
              <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">⚠️ This result indicates a possible concern; please review with a medical professional.</div>
            )}
            {meta.follow_up_questions && meta.follow_up_questions.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">Follow-up questions:</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {meta.follow_up_questions.map((q: string, idx: number) => (
                    <button key={idx} onClick={() => { setInput(q); /* quick send */ setTimeout(() => send(), 60); }} className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {/* Show report details - togglable */}
            {meta.report_facts && Object.keys(meta.report_facts).length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowReportDetails((s) => !s)} className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">{showReportDetails ? 'Hide' : 'View'} report details</button>
                {showReportDetails && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <strong>Facts:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {Object.entries(meta.report_facts).map(([k, v]) => (
                        <li key={k}>{k}: {String(v)}</li>
                      ))}
                    </ul>
                    {meta.report_evidence && meta.report_evidence.length > 0 && (
                      <div className="mt-2">
                        <strong>Evidence snippets:</strong>
                        <ul className="list-disc list-inside mt-1 text-xs">
                          {meta.report_evidence.map((e: any) => (
                            <li key={e.id}>{e.field}: &quot;{e.text.slice(0,120)}...&quot;</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
      <div className="flex gap-2 items-center">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about nutrition, workouts, or preventive suggestions" className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500 text-gray-900" />
        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:from-blue-700 hover:to-sky-600 shadow-sm" onClick={send} disabled={loading}>
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
