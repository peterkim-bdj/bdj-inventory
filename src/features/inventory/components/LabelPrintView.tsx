'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';

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
              <Barcode value={item.barcode} height={50} width={1.5} fontSize={11} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          /* Hide everything */
          body * {
            visibility: hidden !important;
          }
          /* Show only the label area and its children */
          .print-labels,
          .print-labels * {
            visibility: visible !important;
          }
          /* Position labels at top-left of page */
          .print-labels {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            z-index: 99999 !important;
          }
          .label-item {
            page-break-inside: avoid;
            border: 1px solid #000 !important;
            background: white !important;
            color: black !important;
            padding: 8mm 4mm;
            margin-bottom: 4mm;
            width: 60mm;
            text-align: center;
            border-radius: 0 !important;
          }
          .label-item p {
            color: black !important;
          }
          .label-item svg {
            display: inline-block !important;
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
