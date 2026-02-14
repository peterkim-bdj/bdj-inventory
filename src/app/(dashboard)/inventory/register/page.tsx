'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(
  () => import('@/features/inventory/components/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
  { ssr: false }
);
import { ProductMatchCard } from '@/features/inventory/components/ProductMatchCard';
import { RegisterForm } from '@/features/inventory/components/RegisterForm';
import { RecentRegistrations } from '@/features/inventory/components/RecentRegistrations';
import { LabelPrintView } from '@/features/inventory/components/LabelPrintView';
import { NewProductForm } from '@/features/inventory/components/NewProductForm';
import { useScanProduct } from '@/features/inventory/hooks/useScanProduct';
import { useRegisterInventory } from '@/features/inventory/hooks/useRegisterInventory';
import type { RegisterResult } from '@/features/inventory/types';

export default function InventoryRegisterPage() {
  const t = useTranslations('inventory');

  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<RegisterResult[]>([]);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [printData, setPrintData] = useState<{ items: Array<{ barcode: string }>; productName: string } | null>(null);

  const { data: scanResult, isLoading: isScanning } = useScanProduct(scannedBarcode);
  const registerMutation = useRegisterInventory();

  const handleScan = useCallback((barcode: string) => {
    setScannedBarcode(barcode);
    setSelectedProductId(null);
    setShowNewProductForm(false);
  }, []);

  const handleRegister = useCallback((data: {
    quantity: number;
    locationId?: string;
    condition: string;
    notes?: string;
  }) => {
    if (!selectedProductId) return;

    registerMutation.mutate(
      { productId: selectedProductId, ...data },
      {
        onSuccess: (result) => {
          setRecentRegistrations((prev) => [result, ...prev].slice(0, 5));
          setScannedBarcode(null);
          setSelectedProductId(null);
        },
      }
    );
  }, [selectedProductId, registerMutation]);

  const handleCreateProduct = useCallback(async (data: {
    name: string;
    sku?: string;
    shopifyBarcode?: string;
    productType?: string;
    price?: number;
    vendorName?: string;
  }) => {
    const res = await fetch('/api/inventory/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { product } = await res.json();
      setSelectedProductId(product.id);
      setShowNewProductForm(false);
      setScannedBarcode(null);
    }
  }, []);

  const handlePrintLabels = useCallback((items: Array<{ barcode: string }>, productName: string) => {
    setPrintData({ items, productName });
  }, []);

  const selectedProduct = scanResult?.products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('register.title')}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Scan + Match */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
              {t('scan.title')}
            </h2>
            <BarcodeScanner onScan={handleScan} />
          </div>

          {scannedBarcode && (
            <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
              <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
                {t('scan.results')}
                {scanResult && (
                  <span className="ml-2 text-gray-300">
                    ({scanResult.products.length} {t('scan.found')})
                  </span>
                )}
              </h2>

              {isScanning ? (
                <p className="text-gray-400 py-4 text-center">{t('scan.searching')}</p>
              ) : scanResult && scanResult.products.length > 0 ? (
                <div className="space-y-2">
                  {scanResult.products.map((product) => (
                    <ProductMatchCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProductId === product.id}
                      onSelect={() => setSelectedProductId(product.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-gray-400">{t('scan.noMatch')}</p>
                  <button
                    onClick={() => setShowNewProductForm(true)}
                    className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                  >
                    {t('scan.createNew')}
                  </button>
                </div>
              )}

              {showNewProductForm && (
                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-zinc-800">
                  <NewProductForm
                    initialBarcode={scannedBarcode}
                    onSubmit={handleCreateProduct}
                    isSubmitting={false}
                    onCancel={() => setShowNewProductForm(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Register Form + Recent */}
        <div className="space-y-6">
          {selectedProduct && (
            <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
              <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
                {t('register.formTitle')}
              </h2>
              <RegisterForm
                productName={selectedProduct.variantTitle ? `${selectedProduct.name} — ${selectedProduct.variantTitle}` : selectedProduct.name}
                onSubmit={handleRegister}
                isSubmitting={registerMutation.isPending}
              />
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
            <RecentRegistrations
              registrations={recentRegistrations}
              onPrintLabels={handlePrintLabels}
            />
          </div>
        </div>
      </div>

      {printData && (
        <LabelPrintView
          items={printData.items}
          productName={printData.productName}
          onClose={() => setPrintData(null)}
        />
      )}

    </div>
  );
}
