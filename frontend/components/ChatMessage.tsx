"use client";
import React from 'react';

export default function ChatMessage({ role, children, showAvatar = true, sources, dietPlan, model }: { role: 'user' | 'assistant' | 'system'; children: React.ReactNode; showAvatar?: boolean; sources?: { title?: string; url?: string; relevance?: number }[]; dietPlan?: string[]; model?: string }) {
  const isUser = role === 'user';
  // Style user messages with a primary gradient and assistant messages with a subtle card style
  const userClasses = 'max-w-[75%] rounded-lg p-3 bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-md';
  const assistantClasses = 'max-w-[75%] rounded-lg p-3 bg-white border border-gray-200 text-gray-900 shadow-sm';
  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-3`}> 
      {!isUser && showAvatar && (
        <div className="mr-3 flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xl">🤖</div>
        </div>
      )}
      <div className={`${isUser ? userClasses : assistantClasses} ${isUser ? 'text-right' : 'text-left'}`}>
        {children}
        {sources && sources.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Sources: {sources.map((s, idx) => (
              <a key={idx} href={s.url || '#'} target="_blank" rel="noreferrer" className="underline ml-1">{s.title || s.url || 'source'}</a>
            ))}
          </div>
        )}
        {dietPlan && dietPlan.length > 0 && (
          <div className="mt-2 text-sm text-green-700">
            <strong>Diet Plan:</strong>
            <ul className="list-disc list-inside mt-1">
              {dietPlan.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}
        {model && (
          <div className="mt-1 text-xs text-gray-400">Powered by: {model}</div>
        )}
      </div>
      {isUser && showAvatar && (
        <div className="ml-3 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">🙂</div>
        </div>
      )}
    </div>
  );
}
