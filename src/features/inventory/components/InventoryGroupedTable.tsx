'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import { useInventory } from '../hooks/useInventory';
import type { ProductInventoryGroup, InventoryItemDetail } from '../types';

const statusDotColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  RESERVED: 'bg-yellow-500',
  SOLD: 'bg-gray-400',
  RETURNED: 'bg-blue-500',
  DAMAGED: 'bg-red-500',
};

const statusBadgeColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface InventoryGroupedTableProps {
  groups: ProductInventoryGroup[];
  onItemClick?: (id: string) => void;
  onProductClick?: (productId: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
}

function StatusDots({ statusCounts }: { statusCounts: Partial<Record<string, number>> }) {
  const entries = Object.entries(statusCounts).filter(([, count]) => count && count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {entries.map(([status, count]) => (
        <span key={status} className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDotColors[status] ?? 'bg-gray-300'}`} />
          {count}
        </span>
      ))}
    </div>
  );
}

function ExpandedItemRows({
  productId,
  filters,
  onItemClick,
  onPrint,
}: {
  productId: string;
  filters: { status?: string; locationId?: string; shopifyStoreId?: string; vendorId?: string };
  onItemClick?: (id: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
}) {
  const t = useTranslations('inventory');
  const { data, isLoading } = useInventory({
    productId,
    ...filters,
    limit: 100,
    sortBy: 'receivedAt',
    sortOrder: 'desc',
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={4} className="px-10 py-3 text-sm text-gray-400">
          {t('grouped.loadingItems')}
        </td>
      </tr>
    );
  }

  if (!data?.items || data.items.length === 0) return null;

  return (
    <>
      {data.items.map((item) => (
        <tr
          key={item.id}
          onClick={() => onItemClick?.(item.id)}
          className={`border-b border-gray-50 last:border-b-0 bg-gray-50/50 hover:bg-gray-100/50 dark:bg-zinc-900/30 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40 ${onItemClick ? 'cursor-pointer' : ''}`}
        >
          <td className="py-2.5 pl-14 pr-5">
            <div className="flex items-center gap-3">
              <Barcode value={item.barcode} height={20} width={1} fontSize={8} />
            </div>
          </td>
          <td className="px-5 py-2.5 text-xs text-gray-500 dark:text-zinc-400">
            {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
          </td>
          <td className="px-5 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColors[item.status] ?? ''}`}>
                {t(`status.${item.status}`)}
              </span>
              <span className="text-xs text-gray-400">{t(`condition.${item.condition}`)}</span>
            </div>
          </td>
          <td className="px-5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {new Date(item.receivedAt).toLocaleDateString()}
              </span>
              {onPrint && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPrint(item); }}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-zinc-700"
                  aria-label={t('detail.print')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                </button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function InventoryGroupedTable({
  groups,
  onItemClick,
  onProductClick,
  onPrint,
  filters,
}: InventoryGroupedTableProps & { filters?: { status?: string; locationId?: string; shopifyStoreId?: string; vendorId?: string } }) {
  const t = useTranslations('inventory');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('grouped.product')}</th>
            <th className="px-5 py-3 text-center text-xs uppercase tracking-wider text-gray-500 font-medium w-20">{t('grouped.qty')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('grouped.statusSummary')}</th>
            <th className="px-5 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isExpanded = expandedIds.has(group.product.id);
            return (
              <ProductGroupSection
                key={group.product.id}
                group={group}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(group.product.id)}
                onItemClick={onItemClick}
                onProductClick={onProductClick}
                onPrint={onPrint}
                filters={filters}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductGroupSection({
  group,
  isExpanded,
  onToggle,
  onItemClick,
  onProductClick,
  onPrint,
  filters,
}: {
  group: ProductInventoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick?: (id: string) => void;
  onProductClick?: (productId: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
  filters?: { status?: string; locationId?: string; shopifyStoreId?: string; vendorId?: string };
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 cursor-pointer"
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {group.product.imageUrl ? (
              <Image
                src={group.product.imageUrl}
                alt={group.product.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
            )}
            <div className="min-w-0">
              <p
                className={`font-medium truncate max-w-[300px] ${onProductClick ? 'hover:underline' : ''}`}
                onClick={(e) => {
                  if (onProductClick) {
                    e.stopPropagation();
                    onProductClick(group.product.id);
                  }
                }}
              >
                {group.product.name}
                {group.product.variantTitle && (
                  <span className="ml-1 font-normal text-gray-400">— {group.product.variantTitle}</span>
                )}
              </p>
              {group.product.sku && (
                <p className="text-xs text-gray-400 truncate">{group.product.sku}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5 text-center">
          <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-gray-100 px-2 text-sm font-semibold dark:bg-zinc-800">
            {group.totalCount}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <StatusDots statusCounts={group.statusCounts} />
        </td>
        <td className="px-5 py-3.5">
          {group.product.vendorName && (
            <span className="text-xs text-gray-400 truncate">{group.product.vendorName}</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <ExpandedItemRows
          productId={group.product.id}
          filters={filters ?? {}}
          onItemClick={onItemClick}
          onPrint={onPrint}
        />
      )}
    </>
  );
}
