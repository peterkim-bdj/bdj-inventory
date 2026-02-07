'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductSearch } from '@/features/products/components/ProductSearch';
import { ProductFilters } from '@/features/products/components/ProductFilters';
import { ViewToggle } from '@/features/products/components/ViewToggle';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductGrid } from '@/features/products/components/ProductGrid';
import { QuickFilters } from '@/features/products/components/QuickFilters';
import { ProductDetailPanel } from '@/features/products/components/ProductDetailPanel';

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
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
        </div>
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

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-400">
                {t('pagination.showing', {
                  from: (page - 1) * data.pagination.limit + 1,
                  to: Math.min(page * data.pagination.limit, data.pagination.total),
                  total: data.pagination.total,
                })}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
                      className={`min-w-[36px] h-9 rounded-full text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {String(pageNum).padStart(2, '0')}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {tCommon('button.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductDetailPanel
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  );
}
