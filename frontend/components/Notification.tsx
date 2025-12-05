"use client";
import { useEffect } from 'react';

type NotificationProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
  duration?: number;
};

export default function Notification({ message, type = 'success', onClose, duration = 4000 }: NotificationProps) {
  useEffect(() => {
    const id = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(id);
  }, [onClose, duration]);

  const bg = type === 'success' ? 'bg-green-100 border-green-500 text-green-700' : (type === 'error' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-blue-100 border-blue-500 text-blue-700');

  return (
    <div className={`mb-4 border-l-4 p-4 rounded ${bg}` } role="status" aria-live="polite">
      <div className="text-sm">{message}</div>
    </div>
  );
}
