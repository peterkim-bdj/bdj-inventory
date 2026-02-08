'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ProductMatchCardProps {
  product: {
    id: string;
    name: string;
    sku: string | null;
    shopifyBarcode: string | null;
    barcodePrefix: string;
    imageUrl: string | null;
    price: string | null;
    vendorName: string | null;
    _count: { inventoryItems: number };
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function ProductMatchCard({ product, isSelected, onSelect }: ProductMatchCardProps) {
  const t = useTranslations('inventory');

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-black bg-gray-50 ring-2 ring-black dark:border-white dark:bg-zinc-800 dark:ring-white'
          : 'border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600'
      }`}
    >
      <div className="flex gap-3">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-zinc-800">
            N/A
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          {product.sku && (
            <p className="text-sm text-gray-500 dark:text-zinc-400">SKU: {product.sku}</p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            {product.price && <span>{product.price}</span>}
            <span>{t('register.currentStock', { count: product._count.inventoryItems })}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
