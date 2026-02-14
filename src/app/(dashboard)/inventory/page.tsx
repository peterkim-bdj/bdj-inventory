'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ViewToggle } from '@/components/ViewToggle';
import { Pagination } from '@/components/Pagination';
import { useInventory } from '@/features/inventory/hooks/useInventory';
import { useGroupedInventory } from '@/features/inventory/hooks/useGroupedInventory';
import { useInventoryMutation } from '@/features/inventory/hooks/useInventoryMutation';
import { useLocations } from '@/features/inventory/hooks/useLocations';
import { InventoryStats } from '@/features/inventory/components/InventoryStats';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import { InventoryGrid } from '@/features/inventory/components/InventoryGrid';
import { InventoryGroupedTable } from '@/features/inventory/components/InventoryGroupedTable';
import { SmartSearchInput } from '@/components/SmartSearchInput';
import { InventoryFilters } from '@/features/inventory/components/InventoryFilters';
import { InventoryDetailPanel } from '@/features/inventory/components/InventoryDetailPanel';
import { LabelPrintView } from '@/features/inventory/components/LabelPrintView';
import { ProductDetailPanel } from '@/features/products/components/ProductDetailPanel';
import type { InventoryItemDetail, PrintLabelData } from '@/features/inventory/types';

type InventoryViewMode = 'list' | 'grouped' | 'card';

export default function InventoryPage() {
  const t = useTranslations('inventory');
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { batchRestore, batchPermanentDelete } = useInventoryMutation();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [shopifyStoreId, setShopifyStoreId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [sortBy, setSortBy] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<InventoryViewMode>('grouped');
  const [trash, setTrash] = useState(false);

  // Detail panel state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<PrintLabelData | null>(null);

  // Trash selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Shared filter params
  const filterParams = {
    search: search || undefined,
    status: status || undefined,
    locationId: locationId || undefined,
    shopifyStoreId: shopifyStoreId || undefined,
    vendorId: vendorId || undefined,
  };

  // When in trash mode, force list view
  const effectiveView = trash ? 'list' : view;

  // List/Card view data
  const { data, isLoading } = useInventory({
    ...filterParams,
    trash: trash || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    page,
    limit: 20,
    enabled: effectiveView !== 'grouped',
  });

  // Grouped view data
  const { data: groupedData, isLoading: groupedLoading } = useGroupedInventory({
    ...filterParams,
    sortBy: effectiveView === 'grouped' ? 'totalCount' : undefined,
    sortOrder: effectiveView === 'grouped' ? 'desc' : undefined,
    page: effectiveView === 'grouped' ? page : undefined,
    limit: 20,
    enabled: effectiveView === 'grouped',
  });

  const { data: locData } = useLocations();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((val: string) => { setStatus(val); setPage(1); }, []);
  const handleLocationChange = useCallback((val: string) => { setLocationId(val); setPage(1); }, []);
  const handleStoreChange = useCallback((val: string) => { setShopifyStoreId(val); setPage(1); }, []);
  const handleVendorChange = useCallback((val: string) => { setVendorId(val); setPage(1); }, []);

  const handleViewChange = useCallback((v: InventoryViewMode) => {
    setView(v);
    setPage(1);
  }, []);

  const handleTrashToggle = useCallback(() => {
    setTrash((prev) => !prev);
    setPage(1);
    setSelectedItemId(null);
    setSelectedIds(new Set());
  }, []);

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

  const handleBatchPrint = useCallback((items: Array<{ barcode: string }>, productName: string) => {
    setPrintData({ items, productName });
  }, []);

  const handleMutationSuccess = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  const handleCloseItem = useCallback(() => setSelectedItemId(null), []);
  const handleCloseProduct = useCallback(() => setSelectedProductId(null), []);
  const handleClosePrint = useCallback(() => setPrintData(null), []);

  // Use refs for mutation objects to avoid unstable useCallback deps
  const batchRestoreRef = useRef(batchRestore);
  batchRestoreRef.current = batchRestore;
  const batchPermanentDeleteRef = useRef(batchPermanentDelete);
  batchPermanentDeleteRef.current = batchPermanentDelete;

  const handleBatchRestore = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await batchRestoreRef.current.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleBatchPermanentDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('delete.confirmBatchPermanentDelete', { count: selectedIds.size }))) return;
    await batchPermanentDeleteRef.current.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, t]);

  const selectedItem = data?.items?.find((i: InventoryItemDetail) => i.id === selectedItemId) ?? null;

  // Use grouped data for stats/filters when in grouped view
  const activeStats = effectiveView === 'grouped' ? groupedData?.stats : data?.stats;
  const activeFilters = effectiveView === 'grouped' ? groupedData?.filters : data?.filters;
  const activePagination = effectiveView === 'grouped' ? groupedData?.pagination : data?.pagination;
  const activeLoading = effectiveView === 'grouped' ? groupedLoading : isLoading;
  const hasData = effectiveView === 'grouped'
    ? groupedData?.groups && groupedData.groups.length > 0
    : data?.items && data.items.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {trash ? t('delete.trash') : t('title')}
          </h1>
          {activePagination && (
            <span className="text-sm text-gray-400">
              {effectiveView === 'grouped'
                ? t('grouped.productCount', { count: activePagination.total })
                : t('totalCount', { count: activePagination.total })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Trash toggle (admin only) */}
          {isAdmin && (
            <button
              onClick={handleTrashToggle}
              className={`rounded-full p-2 sm:p-2.5 transition-colors ${
                trash
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800'
              }`}
              aria-label={t('delete.trash')}
              title={t('delete.trash')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
          {!trash && (
            <ViewToggle
              view={view}
              onViewChange={handleViewChange}
              options={[
                { value: 'list' as InventoryViewMode, label: t('view.list') },
                { value: 'grouped' as InventoryViewMode, label: t('view.grouped') },
                { value: 'card' as InventoryViewMode, label: t('view.card') },
              ]}
            />
          )}
          {!trash && (
            <Link
              href="/inventory/register"
              className="rounded-full bg-black px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white whitespace-nowrap transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {t('registerButton')}
            </Link>
          )}
        </div>
      </div>

      {/* Trash banner + bulk actions */}
      {trash && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {selectedIds.size > 0
              ? t('delete.selectedCount', { count: selectedIds.size })
              : t('delete.trashBanner')}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchRestore}
                disabled={batchRestore.isPending}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {t('delete.restoreSelected', { count: selectedIds.size })}
              </button>
              <button
                onClick={handleBatchPermanentDelete}
                disabled={batchPermanentDelete.isPending}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {t('delete.deleteSelected', { count: selectedIds.size })}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats (hide in trash mode) */}
      {!trash && activeStats && <InventoryStats stats={activeStats} />}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <SmartSearchInput value={search} onChange={handleSearchChange} placeholder={t('search.placeholder')} />
        {!trash && (
          <InventoryFilters
            filtersMeta={activeFilters}
            locations={locData?.locations}
            selectedStatus={status}
            selectedLocationId={locationId}
            selectedStoreId={shopifyStoreId}
            selectedVendorId={vendorId}
            onStatusChange={handleStatusChange}
            onLocationChange={handleLocationChange}
            onStoreChange={handleStoreChange}
            onVendorChange={handleVendorChange}
          />
        )}
        {effectiveView !== 'grouped' && (
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
        )}
      </div>

      {/* Content */}
      {activeLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-gray-400">{t('loading')}</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-gray-400">{trash ? t('delete.trashEmpty') : t('noItems')}</p>
          {!trash && (
            <Link href="/inventory/register" className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">
              {t('registerButton')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {effectiveView === 'grouped' ? (
            <InventoryGroupedTable
              groups={groupedData!.groups}
              onItemClick={handleItemClick}
              onProductClick={handleProductClick}
              onPrint={handlePrint}
              onBatchPrint={handleBatchPrint}
              isAdmin={isAdmin}
              filters={{
                status: status || undefined,
                locationId: locationId || undefined,
                shopifyStoreId: shopifyStoreId || undefined,
                vendorId: vendorId || undefined,
              }}
            />
          ) : effectiveView === 'list' ? (
            <InventoryTable
              items={data!.items}
              onItemClick={handleItemClick}
              onProductClick={handleProductClick}
              onPrint={handlePrint}
              isAdmin={isAdmin}
              isTrash={trash}
              selectedIds={trash ? selectedIds : undefined}
              onSelectionChange={trash ? setSelectedIds : undefined}
            />
          ) : (
            <InventoryGrid
              items={data!.items}
              onItemClick={handleItemClick}
              onPrint={handlePrint}
            />
          )}

          {/* Pagination */}
          {activePagination && (
            <Pagination
              page={page}
              totalPages={activePagination.totalPages}
              total={activePagination.total}
              limit={20}
              onPageChange={setPage}
              showingLabel={
                effectiveView === 'grouped'
                  ? t('pagination.showing', {
                      from: (page - 1) * 20 + 1,
                      to: Math.min(page * 20, activePagination.total),
                      total: activePagination.total,
                    })
                  : t('pagination.showing', {
                      from: (page - 1) * 20 + 1,
                      to: Math.min(page * 20, activePagination.total),
                      total: activePagination.total,
                    })
              }
            />
          )}
        </>
      )}

      {/* Inventory Detail Panel */}
      <InventoryDetailPanel
        item={selectedItem}
        onClose={handleCloseItem}
        onProductClick={handleProductClick}
        isAdmin={isAdmin}
        isTrash={trash}
        onMutationSuccess={handleMutationSuccess}
      />

      {/* Product Detail Panel */}
      <ProductDetailPanel
        productId={selectedProductId}
        onClose={handleCloseProduct}
      />

      {/* Print Label */}
      {printData && (
        <LabelPrintView
          items={printData.items}
          productName={printData.productName}
          onClose={handleClosePrint}
        />
      )}
    </div>
  );
}
