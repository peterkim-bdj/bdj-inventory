'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import { useLabelSize } from '../hooks/useLabelSize';
import { LABEL_PRESETS, getLabelBarcodeParams } from '../types';

interface LabelPrintViewProps {
  items: Array<{ barcode: string }>;
  productName: string;
  onClose: () => void;
}

export function LabelPrintView({ items, productName, onClose }: LabelPrintViewProps) {
  const t = useTranslations('inventory');
  const { labelSize, setLabelSize } = useLabelSize();
  const barcodeParams = getLabelBarcodeParams(labelSize);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const previewScale = Math.min(180 / (labelSize.width * 96), 1);
  const previewWidth = labelSize.width * 96 * previewScale;
  const previewHeight = labelSize.height * 96 * previewScale;

  const handlePrint = () => {
    window.print();
  };

  const handleCustomChange = (field: 'width' | 'height', value: string) => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) return;
    setLabelSize({ ...labelSize, [field]: num });
  };

  return (
    <>
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t('labels.title')}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{t('labels.title')}</h2>
            <p className="text-sm text-gray-400">
              {t('labels.count', { count: items.length })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={t('labels.close', { defaultValue: 'Close' })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Label Size Selector */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">{t('labels.size')}</p>
          <div className="flex flex-wrap gap-2">
            {LABEL_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setLabelSize(preset)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  labelSize.key === preset.key
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-zinc-600 dark:text-zinc-300'
                }`}
              >
                {preset.name}
              </button>
            ))}
            <button
              onClick={() => {
                if (labelSize.key !== 'custom') {
                  setLabelSize({ name: 'Custom', key: 'custom', width: labelSize.width, height: labelSize.height });
                }
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                labelSize.key === 'custom'
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-zinc-600 dark:text-zinc-300'
              }`}
            >
              {t('labels.custom')}
            </button>
          </div>

          {labelSize.key === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={labelSize.width}
                step={0.25}
                min={1}
                max={4.1}
                onChange={(e) => handleCustomChange('width', e.target.value)}
                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-600"
              />
              <span className="text-xs text-gray-400">×</span>
              <input
                type="number"
                value={labelSize.height}
                step={0.25}
                min={0.5}
                max={6}
                onChange={(e) => handleCustomChange('height', e.target.value)}
                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-600"
              />
              <span className="text-xs text-gray-400">in</span>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">{t('labels.preview')}</p>
          <div className="flex flex-wrap gap-3">
            {items.map((item, idx) => (
              <div
                key={item.barcode}
                style={{ width: previewWidth, height: previewHeight }}
                className="border border-gray-200 dark:border-zinc-700 rounded flex flex-col items-center justify-center bg-white dark:bg-zinc-800 relative overflow-hidden"
              >
                {items.length > 1 && (
                  <span className="absolute top-0.5 right-1 text-[10px] text-gray-300 dark:text-zinc-500">
                    {idx + 1}/{items.length}
                  </span>
                )}
                {barcodeParams.showProductName && (
                  <p className="text-[8px] text-gray-400 mb-0.5 truncate max-w-[90%]">
                    {productName.slice(0, barcodeParams.productNameMaxChars)}
                  </p>
                )}
                <Barcode
                  value={item.barcode}
                  height={Math.round(barcodeParams.barcodeHeight * previewScale)}
                  width={Math.max(0.5, barcodeParams.barcodeWidth * previewScale)}
                  fontSize={Math.round(barcodeParams.fontSize * previewScale)}
                  margin={barcodeParams.margin}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile paper size tip */}
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">
          {t('labels.paperSizeTip', { width: labelSize.width, height: labelSize.height })}
        </p>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          disabled={items.length === 0}
          className="w-full rounded-full bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {t('labels.printCount', { count: items.length })}
        </button>
      </div>

      {/* Print styles (always in DOM) */}
      <style>{`
        .print-labels-portal {
          position: absolute;
          left: -9999px;
          top: 0;
          opacity: 0;
          pointer-events: none;
        }
        @page {
          size: ${labelSize.width}in ${labelSize.height}in;
          margin: 0;
        }
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body > *:not(.print-labels-portal) {
            display: none !important;
          }
          .print-labels-portal {
            position: static !important;
            left: auto !important;
            top: auto !important;
            opacity: 1 !important;
            display: block !important;
            width: ${labelSize.width}in !important;
            background: white !important;
            color: black !important;
          }
          .label-item {
            width: ${labelSize.width}in;
            height: ${labelSize.height}in;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            background: white !important;
            color: black !important;
            overflow: hidden;
            box-sizing: border-box;
            padding: 0.05in;
          }
          .label-item:last-child {
            page-break-after: auto;
          }
          .label-item svg {
            display: inline-block !important;
            max-width: 95% !important;
          }
          .label-product-name {
            font-size: ${Math.max(6, barcodeParams.fontSize - 2)}px;
            color: black !important;
            margin-bottom: 2px;
            max-width: 95%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>
    </div>

    {/* Print area: portal to body so page-break works (not inside fixed overlay) */}
    {mounted && createPortal(
      <div className="print-labels-portal">
        {items.map((item) => (
          <div key={item.barcode} className="label-item">
            {barcodeParams.showProductName && (
              <p className="label-product-name">
                {productName.slice(0, barcodeParams.productNameMaxChars)}
              </p>
            )}
            <Barcode
              value={item.barcode}
              height={barcodeParams.barcodeHeight}
              width={barcodeParams.barcodeWidth}
              fontSize={barcodeParams.fontSize}
              margin={barcodeParams.margin}
            />
          </div>
        ))}
      </div>,
      document.body
    )}
    </>
  );
}
