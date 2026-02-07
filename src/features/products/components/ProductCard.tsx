'use client';

import Image from 'next/image';
import { Barcode } from '@/components/Barcode';
import type { ProductItem } from '../types';

interface ProductCardProps {
  product: ProductItem;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900 hover:shadow-md transition-shadow">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={400}
          height={160}
          className="mb-3 h-40 w-full rounded object-cover"
        />
      ) : (
        <div className="mb-3 flex h-40 w-full items-center justify-center rounded bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
          No Image
        </div>
      )}
      <h3 className="font-medium text-sm line-clamp-2">
        {product.name}
        {product.variantTitle && (
          <span className="ml-1 font-normal text-zinc-500">— {product.variantTitle}</span>
        )}
      </h3>
      {product.variantOptions && product.variantOptions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {product.variantOptions.map((opt) => (
            <span
              key={opt.name}
              className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {opt.value}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
        {product.sku && <span>{product.sku}</span>}
        {product.vendorName && <span>{product.vendorName}</span>}
      </div>
      {product.shopifyBarcode && (
        <div className="mt-2 flex justify-center">
          <Barcode value={product.shopifyBarcode} height={30} width={1} fontSize={10} />
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {product.price ? `${product.price}` : '—'}
        </span>
        {product.shopifyStore && (
          <span className="text-xs text-zinc-500">{product.shopifyStore.name}</span>
        )}
      </div>
    </div>
  );
}
