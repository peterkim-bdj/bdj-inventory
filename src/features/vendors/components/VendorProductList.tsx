'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface VendorProduct {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  price: string | null;
  productType: string | null;
  _count: { inventoryItems: number };
}

interface VendorProductListProps {
  products: VendorProduct[];
}

export function VendorProductList({ products }: VendorProductListProps) {
  const t = useTranslations('vendors');

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('detail.products')} ({products.length})
        </h2>
      </div>
      {products.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-gray-400">
          {t('detail.noProducts')}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products?search=${encodeURIComponent(product.name)}`}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} width={32} height={32}
                  className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-gray-400">{product.sku || product.productType || ''}</p>
              </div>
              <div className="text-right">
                {product.price && <p className="text-sm font-medium">${product.price}</p>}
                <p className="text-xs text-gray-400">{t('detail.stockCount', { count: product._count.inventoryItems })}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
