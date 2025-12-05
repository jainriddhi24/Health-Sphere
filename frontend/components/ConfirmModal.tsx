import React from 'react';

type ConfirmModalProps = {
  show: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export default function ConfirmModal({
  show,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-40"></div>
      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-11/12 max-w-md">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={onCancel} disabled={isLoading}>{cancelText}</button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
