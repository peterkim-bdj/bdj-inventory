'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { ProductItem } from '../types';

interface ProductListProps {
  products: ProductItem[];
  onProductClick?: (id: string) => void;
}

export function ProductList({ products, onProductClick }: ProductListProps) {
  const t = useTranslations('products');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:bg-zinc-800/50 dark:border-zinc-800">
            <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.name')}</th>
            <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.sku')}</th>
            <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.vendor')}</th>
            <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.store')}</th>
            <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.barcode')}</th>
            <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.price')}</th>
            <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.type')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              onClick={() => onProductClick?.(product.id)}
              className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${
                onProductClick ? 'cursor-pointer' : ''
              }`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  )}
                  <span className="font-medium">
                    {product.name}
                    {product.variantTitle && (
                      <span className="ml-1 font-normal text-gray-400">— {product.variantTitle}</span>
                    )}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 text-gray-500">{product.sku ?? '—'}</td>
              <td className="px-5 py-4 text-gray-500">{product.vendorName ?? '—'}</td>
              <td className="px-5 py-4 text-gray-500">{product.shopifyStore?.name ?? '—'}</td>
              <td className="px-5 py-4">
                {product.shopifyBarcode ? (
                  <div className="inline-flex rounded-lg bg-gray-50 px-2 py-1 dark:bg-zinc-800">
                    <Barcode value={product.shopifyBarcode} height={24} width={1} fontSize={9} />
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-5 py-4 text-right font-bold">
                {product.price ? `${product.price}` : '—'}
              </td>
              <td className="px-5 py-4 text-gray-500">{product.productType ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
