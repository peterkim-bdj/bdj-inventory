'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ViewToggle } from '@/components/ViewToggle';
import { Pagination } from '@/components/Pagination';
import { useInventory } from '@/features/inventory/hooks/useInventory';
import { useLocations } from '@/features/inventory/hooks/useLocations';
import { InventoryStats } from '@/features/inventory/components/InventoryStats';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import { InventoryGrid } from '@/features/inventory/components/InventoryGrid';
import { SmartSearchInput } from '@/components/SmartSearchInput';
import { InventoryFilters } from '@/features/inventory/components/InventoryFilters';
import { InventoryDetailPanel } from '@/features/inventory/components/InventoryDetailPanel';
import { LabelPrintView } from '@/features/inventory/components/LabelPrintView';
import { ProductDetailPanel } from '@/features/products/components/ProductDetailPanel';
import type { InventoryItemDetail } from '@/features/inventory/types';

export default function InventoryPage() {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [shopifyStoreId, setShopifyStoreId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [sortBy, setSortBy] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'card'>('list');

  // Detail panel state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{ items: Array<{ barcode: string }>; productName: string } | null>(null);

  const { data, isLoading } = useInventory({
    search: search || undefined,
    status: status || undefined,
    locationId: locationId || undefined,
    shopifyStoreId: shopifyStoreId || undefined,
    vendorId: vendorId || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    page,
    limit: 20,
  });

  const { data: locData } = useLocations();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const resetFilter = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  const handleItemClick = useCallback((id: string) => {
    setSelectedItemId(id);
    setSelectedProductId(null);
  }, []);

  const handleProductClick = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setSelectedItemId(null);
  }, []);

  const handlePrint = useCallback((item: InventoryItemDetail) => {
    setPrintData({ items: [{ barcode: item.barcode }], productName: item.product.name });
  }, []);

  const selectedItem = data?.items?.find((i: InventoryItemDetail) => i.id === selectedItemId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          {data?.pagination && (
            <span className="text-sm text-gray-400">
              {t('totalCount', { count: data.pagination.total })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} listLabel={t('view.list')} cardLabel={t('view.card')} />
          <Link
            href="/inventory/register"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {t('registerButton')}
          </Link>
        </div>
      </div>

      {/* Stats */}
      {data?.stats && <InventoryStats stats={data.stats} />}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <SmartSearchInput value={search} onChange={handleSearchChange} placeholder={t('search.placeholder')} />
        <InventoryFilters
          filtersMeta={data?.filters}
          locations={locData?.locations}
          selectedStatus={status}
          selectedLocationId={locationId}
          selectedStoreId={shopifyStoreId}
          selectedVendorId={vendorId}
          onStatusChange={resetFilter(setStatus)}
          onLocationChange={resetFilter(setLocationId)}
          onStoreChange={resetFilter(setShopifyStoreId)}
          onVendorChange={resetFilter(setVendorId)}
        />
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split(':');
            setSortBy(sb);
            setSortOrder(so);
            setPage(1);
          }}
          suppressHydrationWarning
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        >
          <option value="receivedAt:desc">{t('sort.newestFirst')}</option>
          <option value="receivedAt:asc">{t('sort.oldestFirst')}</option>
          <option value="productName:asc">{t('sort.nameAsc')}</option>
          <option value="productName:desc">{t('sort.nameDesc')}</option>
          <option value="barcode:asc">{t('sort.barcodeAsc')}</option>
          <option value="status:asc">{t('sort.statusAsc')}</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-gray-400">{t('loading')}</p>
        </div>
      ) : !data?.items || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-gray-400">{t('noItems')}</p>
          <Link href="/inventory/register" className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">
            {t('registerButton')}
          </Link>
        </div>
      ) : (
        <>
          {view === 'list' ? (
            <InventoryTable
              items={data.items}
              onItemClick={handleItemClick}
              onProductClick={handleProductClick}
              onPrint={handlePrint}
            />
          ) : (
            <InventoryGrid
              items={data.items}
              onItemClick={handleItemClick}
              onPrint={handlePrint}
            />
          )}

          {/* Numbered Pagination */}
          {data.pagination && (
            <Pagination
              page={page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={20}
              onPageChange={setPage}
              showingLabel={t('pagination.showing', {
                from: (page - 1) * 20 + 1,
                to: Math.min(page * 20, data.pagination.total),
                total: data.pagination.total,
              })}
            />
          )}
        </>
      )}

      {/* Inventory Detail Panel */}
      <InventoryDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
        onProductClick={handleProductClick}
      />

      {/* Product Detail Panel */}
      <ProductDetailPanel
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />

      {/* Print Label */}
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
