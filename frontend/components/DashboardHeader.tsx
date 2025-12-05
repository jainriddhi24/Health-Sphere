"use client";
import Link from 'next/link';

export default function DashboardHeader({ title, showBack = true }: { title: string; showBack?: boolean }) {
  return (
    <header className="w-full bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        {showBack ? (
          <Link href="/dashboard" className="inline-flex items-center justify-center w-10 h-10 rounded bg-white/10 hover:bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        ) : <div className="w-10 h-10" />}
        <h2 className="text-white text-xl font-semibold">{title}</h2>
        <div className="flex-1" />
        {/* Placeholder for contextual actions if needed */}
      </div>
    </header>
  );
}
