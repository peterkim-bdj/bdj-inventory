'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { InventoryItemDetail } from '../types';

interface InventoryDetailPanelProps {
  item: InventoryItemDetail | null;
  onClose: () => void;
  onProductClick?: (productId: string) => void;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function InventoryDetailPanel({ item, onClose, onProductClick }: InventoryDetailPanelProps) {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (item) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 transition-opacity" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={tCommon('button.close')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Barcode (large) */}
          <div className="flex justify-center rounded-lg bg-gray-50 p-4 dark:bg-zinc-800">
            <Barcode value={item.barcode} height={50} width={2} fontSize={14} />
          </div>

          {/* Product info (clickable) */}
          <div
            className={`flex items-center gap-4 rounded-xl border border-gray-100 p-4 dark:border-zinc-800 ${onProductClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50' : ''}`}
            onClick={() => onProductClick?.(item.product.id)}
          >
            {item.product.imageUrl ? (
              <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-zinc-800" />
            )}
            <div>
              <p className="font-medium">
                {item.product.name}
                {item.product.variantTitle && (
                  <span className="ml-1 font-normal text-gray-400">— {item.product.variantTitle}</span>
                )}
              </p>
              {item.product.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
              {onProductClick && <p className="text-xs text-blue-500 mt-0.5">{t('detail.viewProduct')}</p>}
            </div>
          </div>

          {/* Item details */}
          <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">{t('detail.itemInfo')}</h3>
            <div className="grid grid-cols-2 gap-y-3">
              <DetailRow label={t('table.status')}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
                  {t(`status.${item.status}`)}
                </span>
              </DetailRow>
              <DetailRow label={t('table.condition')} value={t(`condition.${item.condition}`)} />
              <DetailRow label={t('table.location')} value={item.location ? `${item.location.name} (${item.location.code})` : '\u2014'} />
              <DetailRow label={t('table.receivedAt')} value={new Date(item.receivedAt).toLocaleDateString()} />
              {item.soldAt && <DetailRow label={t('detail.soldAt')} value={new Date(item.soldAt).toLocaleDateString()} />}
              {item.notes && <DetailRow label={t('detail.notes')} value={item.notes} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <>
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
      {children ?? <span className="text-sm font-medium">{value ?? '\u2014'}</span>}
    </>
  );
}
