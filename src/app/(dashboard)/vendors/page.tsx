'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ViewToggle } from '@/components/ViewToggle';
import { SmartSearchInput } from '@/components/SmartSearchInput';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { VendorTable } from '@/features/vendors/components/VendorTable';
import { VendorGrid } from '@/features/vendors/components/VendorGrid';
import { VendorFilters } from '@/features/vendors/components/VendorFilters';

export default function VendorsPage() {
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [hasContact, setHasContact] = useState('');
  const [isActive, setIsActive] = useState('');
  const [autoNotify, setAutoNotify] = useState('');
  const [sortBy, setSortBy] = useState('contactStatus');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'card'>('list');

  const { data, isLoading } = useVendors({
    search: search || undefined,
    hasContact: hasContact || undefined,
    isActive: isActive || undefined,
    autoNotify: autoNotify || undefined,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  });

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const resetFilter = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  const handleVendorClick = useCallback((id: string) => {
    router.push(`/vendors/${id}`);
  }, [router]);

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
          <ViewToggle
            view={view}
            onViewChange={setView}
            options={[
              { value: 'list', label: t('view.list') },
              { value: 'card', label: t('view.card') },
            ]}
          />
          {isAdmin && (
            <>
              <Link
                href="/vendors/import"
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {tCommon('button.import')}
              </Link>
              <Link
                href="/vendors/new"
                className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {t('addVendor')}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <SmartSearchInput value={search} onChange={handleSearchChange} placeholder={t('search.placeholder')} />
        <VendorFilters
          selectedHasContact={hasContact}
          selectedIsActive={isActive}
          selectedAutoNotify={autoNotify}
          onHasContactChange={resetFilter(setHasContact)}
          onIsActiveChange={resetFilter(setIsActive)}
          onAutoNotifyChange={resetFilter(setAutoNotify)}
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
          <option value="contactStatus:asc">{t('sort.missingFirst')}</option>
          <option value="name:asc">{t('sort.nameAsc')}</option>
          <option value="name:desc">{t('sort.nameDesc')}</option>
          <option value="productCount:desc">{t('sort.mostProducts')}</option>
          <option value="minLeadDays:asc">{t('sort.shortestLead')}</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
        </div>
      ) : !data?.vendors || data.vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-gray-400">{t('noVendors')}</p>
          {isAdmin && (
            <Link href="/vendors/new" className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">
              {t('addVendor')}
            </Link>
          )}
        </div>
      ) : (
        <>
          {view === 'list' ? (
            <VendorTable vendors={data.vendors} onVendorClick={handleVendorClick} />
          ) : (
            <VendorGrid vendors={data.vendors} onVendorClick={handleVendorClick} />
          )}

          {/* Pagination */}
          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-400">
                {t('pagination.showing', {
                  from: (page - 1) * 20 + 1,
                  to: Math.min(page * 20, data.pagination.total),
                  total: data.pagination.total,
                })}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  {tCommon('button.previous')}
                </button>
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.pagination.totalPages - 4));
                  const pageNum = start + i;
                  if (pageNum > data.pagination.totalPages) return null;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`min-w-[36px] h-9 rounded-full text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'
                      }`}>{String(pageNum).padStart(2, '0')}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages}
                  className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800">
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
