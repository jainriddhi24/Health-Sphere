"use client";
import Link from 'next/link';

export default function DashboardFooter() {
  return (
    <footer className="w-full bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-gray-100">
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </div>
        <div className="text-sm">© {new Date().getFullYear()} HealthSphere</div>
      </div>
    </footer>
  );
}
