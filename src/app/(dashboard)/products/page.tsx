'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductSearch } from '@/features/products/components/ProductSearch';
import { ProductFilters } from '@/features/products/components/ProductFilters';
import { ViewToggle } from '@/features/products/components/ViewToggle';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductGrid } from '@/features/products/components/ProductGrid';

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

  const { data, isLoading } = useProducts({
    search: search || undefined,
    storeIds: storeIds.length ? storeIds : undefined,
    vendorIds: vendorIds.length ? vendorIds : undefined,
    productTypes: productTypes.length ? productTypes : undefined,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ProductSearch value={search} onChange={handleSearchChange} />
        {data?.filters && (
          <ProductFilters
            filters={data.filters}
            selectedStoreIds={storeIds}
            selectedVendorIds={vendorIds}
            selectedProductTypes={productTypes}
            onStoreChange={(ids) => { setStoreIds(ids); setPage(1); }}
            onVendorChange={(ids) => { setVendorIds(ids); setPage(1); }}
            onProductTypeChange={(types) => { setProductTypes(types); setPage(1); }}
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
          className="rounded-md border px-2 py-1.5 text-xs dark:bg-zinc-800 dark:border-zinc-700"
        >
          <option value="name:asc">{t('sort.nameAsc')}</option>
          <option value="name:desc">{t('sort.nameDesc')}</option>
          <option value="price:asc">{t('sort.priceAsc')}</option>
          <option value="price:desc">{t('sort.priceDesc')}</option>
          <option value="updatedAt:desc">{t('sort.newest')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-zinc-500">{tCommon('status.loading')}</p>
      ) : !data || data.products.length === 0 ? (
        <p className="text-zinc-500">{tCommon('status.noData')}</p>
      ) : (
        <>
          {view === 'list' ? (
            <ProductList products={data.products} />
          ) : (
            <ProductGrid products={data.products} />
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-zinc-500">
                {t('pagination.showing', {
                  from: (page - 1) * data.pagination.limit + 1,
                  to: Math.min(page * data.pagination.limit, data.pagination.total),
                  total: data.pagination.total,
                })}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  {tCommon('button.previous')}
                </button>
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.pagination.totalPages - 4));
                  const pageNum = start + i;
                  if (pageNum > data.pagination.totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`rounded border px-3 py-1 text-sm ${
                        pageNum === page ? 'bg-blue-600 text-white border-blue-600' : ''
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  {tCommon('button.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
