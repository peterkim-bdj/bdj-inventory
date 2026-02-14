'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const BarcodeScanTab = dynamic(
  () => import('./BarcodeScanTab').then((m) => ({ default: m.BarcodeScanTab })),
  { ssr: false }
);
const OcrScanTab = dynamic(
  () => import('./OcrScanTab').then((m) => ({ default: m.OcrScanTab })),
  { ssr: false }
);

interface ScanModalProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

export function ScanModal({ onResult, onClose }: ScanModalProps) {
  const t = useTranslations('common');
  const [activeTab, setActiveTab] = useState<'barcode' | 'ocr'>('barcode');

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl">
        {/* Header with tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-5 py-4">
          <div className="flex gap-1 rounded-full border border-gray-200 dark:border-zinc-700 p-0.5">
            <button
              onClick={() => setActiveTab('barcode')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'barcode'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('scan.barcodeTab')}
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'ocr'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('scan.ocrTab')}
            </button>
          </div>

          {/* Close button */}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'barcode' ? (
            <BarcodeScanTab onResult={onResult} />
          ) : (
            <OcrScanTab onResult={onResult} />
          )}
        </div>
      </div>
    </div>
  );
}
