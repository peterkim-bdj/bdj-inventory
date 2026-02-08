'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface NewProductFormProps {
  initialBarcode?: string;
  onSubmit: (data: {
    name: string;
    sku?: string;
    shopifyBarcode?: string;
    productType?: string;
    price?: number;
    vendorName?: string;
  }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function NewProductForm({ initialBarcode, onSubmit, isSubmitting, onCancel }: NewProductFormProps) {
  const t = useTranslations('inventory');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [shopifyBarcode, setShopifyBarcode] = useState(initialBarcode ?? '');
  const [productType, setProductType] = useState('');
  const [price, setPrice] = useState('');
  const [vendorName, setVendorName] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      sku: sku || undefined,
      shopifyBarcode: shopifyBarcode || undefined,
      productType: productType || undefined,
      price: price ? Number(price) : undefined,
      vendorName: vendorName || undefined,
    });
  }, [name, sku, shopifyBarcode, productType, price, vendorName, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium">{t('newProduct.title')}</h3>

      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('newProduct.name')} *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.sku')}
          </label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.barcode')}
          </label>
          <input
            type="text"
            value={shopifyBarcode}
            onChange={(e) => setShopifyBarcode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.productType')}
          </label>
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.price')}
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('newProduct.vendorName')}
        </label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name || isSubmitting}
          className="flex-1 rounded-full bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isSubmitting ? t('newProduct.creating') : t('newProduct.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-200 px-4 py-2.5 text-sm dark:border-zinc-700"
        >
          {t('newProduct.cancel')}
        </button>
      </div>
    </form>
  );
}
