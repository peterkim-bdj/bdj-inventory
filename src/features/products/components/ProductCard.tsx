'use client';

import Image from 'next/image';
import { Barcode } from '@/components/Barcode';
import type { ProductItem } from '../types';

interface ProductCardProps {
  product: ProductItem;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-lg transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={400}
          height={160}
          className="mb-3 h-40 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg bg-gray-50 text-gray-400 dark:bg-zinc-800">
          No Image
        </div>
      )}
      <h3 className="font-medium text-sm line-clamp-2">
        {product.name}
        {product.variantTitle && (
          <span className="ml-1 font-normal text-gray-400">— {product.variantTitle}</span>
        )}
      </h3>
      {product.variantOptions && product.variantOptions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {product.variantOptions.map((opt) => (
            <span
              key={opt.name}
              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {opt.value}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
        {product.sku && <span>{product.sku}</span>}
        {product.vendorName && <span>{product.vendorName}</span>}
      </div>
      {product.shopifyBarcode && (
        <div className="mt-2 flex justify-center rounded-lg bg-gray-50 p-2 dark:bg-zinc-800">
          <Barcode value={product.shopifyBarcode} height={30} width={1} fontSize={10} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold">
          {product.price ? `${product.price}` : '—'}
        </span>
        {product.shopifyStore && (
          <span className="text-xs text-gray-400">{product.shopifyStore.name}</span>
        )}
      </div>
    </div>
  );
}
