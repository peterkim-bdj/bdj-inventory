'use client';

import type { ProductItem } from '../types';

interface ProductCardProps {
  product: ProductItem;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900 hover:shadow-md transition-shadow">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="mb-3 h-40 w-full rounded object-cover"
        />
      ) : (
        <div className="mb-3 flex h-40 w-full items-center justify-center rounded bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
          No Image
        </div>
      )}
      <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
        {product.sku && <span>{product.sku}</span>}
        {product.vendorName && <span>{product.vendorName}</span>}
      </div>
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
