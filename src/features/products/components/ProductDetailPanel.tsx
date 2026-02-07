'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import { useProduct } from '../hooks/useProduct';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

interface ProductDetailPanelProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailPanel({ productId, onClose }: ProductDetailPanelProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const { data, isLoading } = useProduct(productId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (productId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [productId, onClose]);

  if (!productId) return null;

  const product = data?.product;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={tCommon('button.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
          </div>
        ) : !product ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-lg text-gray-400">{tCommon('error.notFound')}</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-6">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={600}
                height={240}
                className="w-full h-48 rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-48 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                {t('card.noImage')}
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold">{product.name}</h2>
              {product.variantTitle && (
                <p className="text-sm text-gray-400 mt-1">{product.variantTitle}</p>
              )}
              {product.description && (
                <p className="text-sm text-gray-500 mt-2">{stripHtml(product.description)}</p>
              )}
            </div>

            {product.variantOptions && product.variantOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.variantOptions.map((opt) => (
                  <span
                    key={opt.name}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {opt.name}: {opt.value}
                  </span>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                {t('detail.details')}
              </h3>
              <div className="grid grid-cols-2 gap-y-3">
                <DetailRow label={t('detail.sku')} value={product.sku} />
                <DetailRow label={t('detail.barcodePrefix')} value={product.barcodePrefix} />
                <DetailRow label={t('detail.price')} value={product.price} />
                <DetailRow label={t('detail.compareAtPrice')} value={product.compareAtPrice} />
                <DetailRow label={t('detail.productType')} value={product.productType} />
                <DetailRow label={t('detail.vendor')} value={product.vendor?.name ?? product.vendorName} />
                <DetailRow label={t('detail.store')} value={product.shopifyStore?.name} />
              </div>
            </div>

            {product.shopifyBarcode && (
              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                  {t('detail.barcode')}
                </h3>
                <div className="flex justify-center rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
                  <Barcode value={product.shopifyBarcode} height={40} width={1.5} fontSize={12} />
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                {t('detail.shopifyInfo')}
              </h3>
              <div className="grid grid-cols-2 gap-y-3">
                <DetailRow label={t('detail.shopifyProductId')} value={product.shopifyProductId} />
                <DetailRow label={t('detail.shopifyVariantId')} value={product.shopifyVariantId} />
                <DetailRow label={t('detail.synced')} value={product.shopifySynced ? t('detail.yes') : t('detail.no')} />
                <DetailRow label={t('detail.productGroup')} value={product.productGroup?.name} />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                {t('detail.timestamps')}
              </h3>
              <div className="grid grid-cols-2 gap-y-3">
                <DetailRow label={t('detail.createdAt')} value={new Date(product.createdAt).toLocaleDateString()} />
                <DetailRow label={t('detail.updatedAt')} value={new Date(product.updatedAt).toLocaleDateString()} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </>
  );
}
