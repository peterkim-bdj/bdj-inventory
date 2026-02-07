'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ProductItem } from '../types';

interface ProductListProps {
  products: ProductItem[];
}

export function ProductList({ products }: ProductListProps) {
  const t = useTranslations('products');

  return (
    <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-zinc-50 dark:bg-zinc-800/50">
            <th className="px-4 py-3 text-left font-medium">{t('table.name')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('table.sku')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('table.vendor')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('table.store')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('table.price')}</th>
            <th className="px-4 py-3 text-left font-medium">{t('table.type')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <span className="font-medium">
                    {product.name}
                    {product.variantTitle && (
                      <span className="ml-1 font-normal text-zinc-500">— {product.variantTitle}</span>
                    )}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500">{product.sku ?? '—'}</td>
              <td className="px-4 py-3 text-zinc-500">{product.vendorName ?? '—'}</td>
              <td className="px-4 py-3 text-zinc-500">{product.shopifyStore?.name ?? '—'}</td>
              <td className="px-4 py-3 text-right">
                {product.price ? `${product.price}` : '—'}
              </td>
              <td className="px-4 py-3 text-zinc-500">{product.productType ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
