'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { InventoryItemDetail } from '../types';

interface InventoryCardProps {
  item: InventoryItemDetail;
  onClick?: () => void;
  onPrint?: () => void;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function InventoryCard({ item, onClick, onPrint }: InventoryCardProps) {
  const t = useTranslations('inventory');

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Product image */}
      {item.product.imageUrl ? (
        <Image src={item.product.imageUrl} alt={item.product.name} width={400} height={120}
          className="mb-3 h-28 w-full rounded-lg object-cover" />
      ) : (
        <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-gray-50 text-gray-400 dark:bg-zinc-800">
          No Image
        </div>
      )}

      {/* Product name + SKU */}
      <h3 className="font-medium text-sm line-clamp-2">
        {item.product.name}
        {item.product.variantTitle && (
          <span className="ml-1 font-normal text-gray-400">— {item.product.variantTitle}</span>
        )}
      </h3>
      {item.product.sku && <p className="text-xs text-gray-400 mt-0.5">{item.product.sku}</p>}

      {/* Status + Condition badges */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
          {t(`status.${item.status}`)}
        </span>
        <span className="text-xs text-gray-400">{t(`condition.${item.condition}`)}</span>
      </div>

      {/* Location */}
      <p className="mt-1.5 text-xs text-gray-400">
        {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
      </p>

      {/* Barcode image */}
      <div className="mt-2 flex justify-center rounded-lg bg-gray-50 p-2 dark:bg-zinc-800">
        <Barcode value={item.barcode} height={30} width={1} fontSize={10} />
      </div>

      {/* Footer: date + print */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{new Date(item.receivedAt).toLocaleDateString()}</span>
        {onPrint && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrint(); }}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
            aria-label={t('detail.print')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
