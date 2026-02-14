'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useProducts } from '@/features/products/hooks/useProducts';
import { SmartSearchInput } from '@/components/SmartSearchInput';
import { Pagination } from '@/components/Pagination';
import { ProductFilters } from '@/features/products/components/ProductFilters';
import { ViewToggle } from '@/features/products/components/ViewToggle';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductGrid } from '@/features/products/components/ProductGrid';
import { QuickFilters } from '@/features/products/components/QuickFilters';
import { ProductDetailPanel } from '@/features/products/components/ProductDetailPanel';
import { TableSkeleton, CardGridSkeleton } from '@/components/Skeleton';

export default function ProductsPage() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');

  const [search, setSearch] = useState('');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'card'>('list');
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const handleStoreChange = useCallback((ids: string[]) => { setStoreIds(ids); setPage(1); }, []);
  const handleVendorChange = useCallback((ids: string[]) => { setVendorIds(ids); setPage(1); }, []);
  const handleProductTypeChange = useCallback((types: string[]) => { setProductTypes(types); setPage(1); }, []);
  const handleCloseProduct = useCallback(() => setSelectedProductId(null), []);

  const { data, isLoading } = useProducts({
    search: search || undefined,
    storeIds: storeIds.length ? storeIds : undefined,
    vendorIds: vendorIds.length ? vendorIds : undefined,
    productTypes: productTypes.length ? productTypes : undefined,
    ...quickFilters,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleQuickFilterToggle = useCallback((key: string, value: string) => {
    setQuickFilters((prev) => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          {data?.pagination && (
            <span className="text-sm text-gray-400">
              {t('totalCount', { count: data.pagination.total })}
            </span>
          )}
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SmartSearchInput value={search} onChange={handleSearchChange} placeholder={t('search.placeholder')} />
        {data?.filters && (
          <ProductFilters
            filters={data.filters}
            selectedStoreIds={storeIds}
            selectedVendorIds={vendorIds}
            selectedProductTypes={productTypes}
            onStoreChange={handleStoreChange}
            onVendorChange={handleVendorChange}
            onProductTypeChange={handleProductTypeChange}
          />
        )}
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
          <option value="name:asc">{t('sort.nameAsc')}</option>
          <option value="name:desc">{t('sort.nameDesc')}</option>
          <option value="price:asc">{t('sort.priceAsc')}</option>
          <option value="price:desc">{t('sort.priceDesc')}</option>
          <option value="updatedAt:desc">{t('sort.newest')}</option>
        </select>
      </div>

      <QuickFilters activeFilters={quickFilters} onToggle={handleQuickFilterToggle} />

      {isLoading ? (
        view === 'list' ? <TableSkeleton rows={6} cols={5} /> : <CardGridSkeleton count={6} />
      ) : !data || data.products.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-gray-400">{tCommon('status.noData')}</p>
        </div>
      ) : (
        <>
          {view === 'list' ? (
            <ProductList products={data.products} onProductClick={setSelectedProductId} />
          ) : (
            <ProductGrid products={data.products} onProductClick={setSelectedProductId} />
          )}

          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setPage}
            showingLabel={t('pagination.showing', {
              from: (page - 1) * data.pagination.limit + 1,
              to: Math.min(page * data.pagination.limit, data.pagination.total),
              total: data.pagination.total,
            })}
          />
        </>
      )}

      <ProductDetailPanel
        productId={selectedProductId}
        onClose={handleCloseProduct}
      />
    </div>
  );
}
