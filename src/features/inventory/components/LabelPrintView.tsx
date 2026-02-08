'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';

interface LabelPrintViewProps {
  items: Array<{ barcode: string }>;
  productName: string;
  onClose: () => void;
}

export function LabelPrintView({ items, productName, onClose }: LabelPrintViewProps) {
  const t = useTranslations('inventory');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('labels.title')}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {t('labels.print')}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={printRef} className="print-labels">
          {items.map((item) => (
            <div
              key={item.barcode}
              className="label-item mb-4 rounded-lg border border-gray-200 p-3 text-center dark:border-zinc-700"
            >
              <p className="text-xs text-gray-400 mb-1">{productName}</p>
              <p className="text-lg font-mono font-bold">{item.barcode}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.print-labels) { display: none !important; }
          .print-labels { display: block !important; }
          .label-item {
            page-break-inside: avoid;
            border: 1px solid #000;
            padding: 8mm 4mm;
            margin-bottom: 2mm;
            width: 50mm;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
