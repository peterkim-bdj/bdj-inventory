'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ScanModal = dynamic(
  () => import('@/components/scan/ScanModal').then((m) => ({ default: m.ScanModal })),
  { ssr: false }
);

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SmartSearchInput({
  value,
  onChange,
  placeholder = '',
  debounceMs = 300,
}: SmartSearchInputProps) {
  const [local, setLocal] = useState(value);
  const [showScanModal, setShowScanModal] = useState(false);

  // Debounce: local → parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, value, onChange, debounceMs]);

  // Sync parent → local
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleScanResult = useCallback((text: string) => {
    setLocal(text);
    setShowScanModal(false);
  }, []);

  const handleOpenScan = useCallback(() => setShowScanModal(true), []);
  const handleCloseScan = useCallback(() => setShowScanModal(false), []);

  return (
    <>
      <div className="relative">
        {/* Scan icon button (left) */}
        <button
          type="button"
          onClick={handleOpenScan}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Scan"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        </button>

        {/* Search input */}
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          suppressHydrationWarning
          className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
      </div>

      {/* Scan Modal */}
      {showScanModal && (
        <ScanModal
          onResult={handleScanResult}
          onClose={handleCloseScan}
        />
      )}
    </>
  );
}
