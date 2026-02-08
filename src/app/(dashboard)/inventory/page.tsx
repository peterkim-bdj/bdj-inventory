'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useInventory } from '@/features/inventory/hooks/useInventory';
import { InventoryStats } from '@/features/inventory/components/InventoryStats';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import { useLocations } from '@/features/inventory/hooks/useLocations';
import { INVENTORY_STATUS } from '@/features/inventory/types';

export default function InventoryPage() {
  const t = useTranslations('inventory');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInventory({
    search: search || undefined,
    status: status || undefined,
    locationId: locationId || undefined,
    page,
    limit: 20,
  });

  const { data: locData } = useLocations();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

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
        <Link
          href="/inventory/register"
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {t('registerButton')}
        </Link>
      </div>

      {/* Stats */}
      {data?.stats && <InventoryStats stats={data.stats} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder={t('search.placeholder')}
          className="w-72 rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t('filter.allStatuses')}</option>
          {INVENTORY_STATUS.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>

        <select
          value={locationId}
          onChange={(e) => { setLocationId(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t('filter.allLocations')}</option>
          {locData?.locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-lg text-gray-400">{t('loading')}</p>
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-gray-400">{t('noItems')}</p>
          <Link
            href="/inventory/register"
            className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            {t('registerButton')}
          </Link>
        </div>
      ) : (
        <>
          <InventoryTable items={data.items} />

          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm disabled:opacity-30 dark:border-zinc-700"
              >
                {t('pagination.previous')}
              </button>
              <span className="px-3 text-sm text-gray-500">
                {t('pagination.page', { current: page, total: data.pagination.totalPages })}
              </span>
              <button
                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                disabled={page >= data.pagination.totalPages}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm disabled:opacity-30 dark:border-zinc-700"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
