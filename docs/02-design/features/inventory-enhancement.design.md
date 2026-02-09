# Inventory Enhancement Design Document

> **Summary**: Inventory 대시보드를 Products 수준으로 기능 강화 (검색/필터, 카드뷰, 상세패널, 바코드, 인쇄)
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-08
> **Status**: Draft
> **Planning Doc**: [inventory-enhancement.plan.md](../../01-plan/features/inventory-enhancement.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Products 페이지와 동일한 UX 패턴 적용 (일관성)
- DB 스키마 변경 없이 API 확장만으로 구현
- 기존 공통 컴포넌트(`<Barcode>`, `LabelPrintView`) 재사용
- ViewToggle을 공통 컴포넌트로 추출하여 재사용

### 1.2 Design Principles

- Products 페이지 패턴을 최대한 따름 (동일 UX)
- 기존 코드 수정 최소화 (새 컴포넌트 추가 위주)
- i18n 키 완전 커버

---

## 2. File Change Summary

| # | Type | File | Sprint |
|---|------|------|:------:|
| 1 | MODIFY | `src/features/inventory/types/index.ts` | 1 |
| 2 | MODIFY | `src/app/api/inventory/route.ts` | 1 |
| 3 | NEW | `src/components/ViewToggle.tsx` | 1 |
| 4 | MODIFY | `src/features/products/components/ViewToggle.tsx` | 1 |
| 5 | NEW | `src/features/inventory/components/InventorySearch.tsx` | 1 |
| 6 | NEW | `src/features/inventory/components/InventoryFilters.tsx` | 1 |
| 7 | MODIFY | `src/app/(dashboard)/inventory/page.tsx` | 1 |
| 8 | NEW | `src/features/inventory/components/InventoryCard.tsx` | 2 |
| 9 | NEW | `src/features/inventory/components/InventoryGrid.tsx` | 2 |
| 10 | MODIFY | `src/features/inventory/components/InventoryTable.tsx` | 2 |
| 11 | NEW | `src/features/inventory/components/InventoryDetailPanel.tsx` | 3 |
| 12 | MODIFY | `src/app/(dashboard)/inventory/register/page.tsx` | 3 |
| 13 | MODIFY | `src/messages/en/inventory.json` | 3 |
| 14 | MODIFY | `src/messages/ko/inventory.json` | 3 |
| **Total** | **6 NEW + 8 MODIFY** | **14 files** | |

---

## 3. Sprint 1: API 확장 + 검색/필터/정렬

### 3.1 Types 확장

**File**: `src/features/inventory/types/index.ts`

**Changes**:
- `inventoryQuerySchema`에 `shopifyStoreId`, `vendorId` 추가
- `InventoryFilters` 인터페이스 추가 (API 응답용)

```typescript
// ADD to inventoryQuerySchema
export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(INVENTORY_STATUS).optional(),
  locationId: z.string().optional(),
  productId: z.string().optional(),
  shopifyStoreId: z.string().optional(),   // NEW
  vendorId: z.string().optional(),          // NEW
  sortBy: z.enum(['barcode', 'receivedAt', 'status', 'productName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// NEW interface
export interface InventoryFilterOption {
  id: string;
  name: string;
  count: number;
}

export interface InventoryFiltersMeta {
  stores: InventoryFilterOption[];
  vendors: InventoryFilterOption[];
}
```

### 3.2 API 확장

**File**: `src/app/api/inventory/route.ts`

**Changes**:
- `shopifyStoreId`, `vendorId` 필터링 (Product 관계를 통해)
- 응답에 `filters` 메타데이터 추가

```typescript
// ADD to where clause construction
if (shopifyStoreId) where.product = { ...where.product as object, shopifyStoreId };
if (vendorId) where.product = { ...where.product as object, vendorId };

// ADD to product select
product: {
  select: {
    id: true, name: true, sku: true, imageUrl: true,
    barcodePrefix: true, shopifyBarcode: true,
    shopifyStoreId: true, vendorName: true,  // ADD these
    shopifyStore: { select: { id: true, name: true } },  // ADD
    vendor: { select: { id: true, name: true } },        // ADD
  },
},

// ADD filter metadata query (after items query)
const [storeFilters, vendorFilters] = await Promise.all([
  prisma.$queryRaw`
    SELECT s.id, s.name, COUNT(i.id)::int as count
    FROM "InventoryItem" i
    JOIN "Product" p ON i."productId" = p.id
    JOIN "ShopifyStore" s ON p."shopifyStoreId" = s.id
    GROUP BY s.id, s.name ORDER BY s.name
  `,
  prisma.$queryRaw`
    SELECT v.id, v.name, COUNT(i.id)::int as count
    FROM "InventoryItem" i
    JOIN "Product" p ON i."productId" = p.id
    JOIN "Vendor" v ON p."vendorId" = v.id
    GROUP BY v.id, v.name ORDER BY v.name
  `,
]);

// ADD to response
return NextResponse.json({
  items,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  stats: { byStatus: stats, byLocation: locationStats, total },
  filters: { stores: storeFilters, vendors: vendorFilters },  // NEW
});
```

### 3.3 ViewToggle 공통화

**File (NEW)**: `src/components/ViewToggle.tsx`

```tsx
'use client';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
  listLabel: string;
  cardLabel: string;
}

export function ViewToggle({ view, onViewChange, listLabel, cardLabel }: ViewToggleProps) {
  return (
    <div className="flex rounded-full border border-gray-200 p-0.5 dark:border-zinc-700">
      <button
        onClick={() => onViewChange('list')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          view === 'list'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        {listLabel}
      </button>
      <button
        onClick={() => onViewChange('card')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          view === 'card'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        {cardLabel}
      </button>
    </div>
  );
}
```

**File (MODIFY)**: `src/features/products/components/ViewToggle.tsx`

Update to re-export from common:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { ViewToggle as BaseViewToggle } from '@/components/ViewToggle';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations('products');
  return <BaseViewToggle view={view} onViewChange={onViewChange} listLabel={t('view.list')} cardLabel={t('view.card')} />;
}
```

### 3.4 InventorySearch

**File (NEW)**: `src/features/inventory/components/InventorySearch.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

interface InventorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function InventorySearch({ value, onChange }: InventorySearchProps) {
  const t = useTranslations('inventory');
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, value, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={t('search.placeholder')}
      className="w-72 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
    />
  );
}
```

### 3.5 InventoryFilters

**File (NEW)**: `src/features/inventory/components/InventoryFilters.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { INVENTORY_STATUS } from '../types';
import type { InventoryFiltersMeta, LocationItem } from '../types';

interface InventoryFiltersProps {
  filtersMeta?: InventoryFiltersMeta;
  locations?: LocationItem[];
  selectedStatus: string;
  selectedLocationId: string;
  selectedStoreId: string;
  selectedVendorId: string;
  onStatusChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onStoreChange: (val: string) => void;
  onVendorChange: (val: string) => void;
}

export function InventoryFilters({
  filtersMeta,
  locations,
  selectedStatus,
  selectedLocationId,
  selectedStoreId,
  selectedVendorId,
  onStatusChange,
  onLocationChange,
  onStoreChange,
  onVendorChange,
}: InventoryFiltersProps) {
  const t = useTranslations('inventory');

  const selectClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400';

  return (
    <>
      <select value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allStatuses')}</option>
        {INVENTORY_STATUS.map((s) => (
          <option key={s} value={s}>{t(`status.${s}`)}</option>
        ))}
      </select>

      <select value={selectedLocationId} onChange={(e) => onLocationChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allLocations')}</option>
        {locations?.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
        ))}
      </select>

      {filtersMeta?.stores && filtersMeta.stores.length > 0 && (
        <select value={selectedStoreId} onChange={(e) => onStoreChange(e.target.value)} className={selectClass}>
          <option value="">{t('filter.allStores')}</option>
          {filtersMeta.stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.count})</option>
          ))}
        </select>
      )}

      {filtersMeta?.vendors && filtersMeta.vendors.length > 0 && (
        <select value={selectedVendorId} onChange={(e) => onVendorChange(e.target.value)} className={selectClass}>
          <option value="">{t('filter.allVendors')}</option>
          {filtersMeta.vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name} ({v.count})</option>
          ))}
        </select>
      )}
    </>
  );
}
```

### 3.6 Inventory Page (Sprint 1 state)

**File (MODIFY)**: `src/app/(dashboard)/inventory/page.tsx`

Sprint 1에서 검색/필터/정렬/뷰토글을 통합. 카드뷰와 상세패널은 Sprint 2-3에서 추가.

**Key changes**:
- Import InventorySearch, InventoryFilters, ViewToggle
- State: search, status, locationId, shopifyStoreId, vendorId, sortBy, sortOrder, view, page
- Sort dropdown inline (Products 패턴)
- ViewToggle in header

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ViewToggle } from '@/components/ViewToggle';
import { useInventory } from '@/features/inventory/hooks/useInventory';
import { useLocations } from '@/features/inventory/hooks/useLocations';
import { InventoryStats } from '@/features/inventory/components/InventoryStats';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import { InventorySearch } from '@/features/inventory/components/InventorySearch';
import { InventoryFilters } from '@/features/inventory/components/InventoryFilters';

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
        <InventorySearch value={search} onChange={handleSearchChange} />
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
          {/* Sprint 1: table only. Sprint 2 adds: view === 'list' ? <InventoryTable> : <InventoryGrid> */}
          <InventoryTable items={data.items} />

          {/* Pagination — Sprint 2 upgrades to numbered buttons */}
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
```

---

## 4. Sprint 2: 카드뷰 + 바코드 + 인쇄

### 4.1 InventoryCard

**File (NEW)**: `src/features/inventory/components/InventoryCard.tsx`

```tsx
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { InventoryItemDetail } from '../types';

interface InventoryCardProps {
  item: InventoryItemDetail;
  onClick?: () => void;
  onPrint?: () => void;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function InventoryCard({ item, onClick, onPrint }: InventoryCardProps) {
  const t = useTranslations('inventory');

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Product image */}
      {item.product.imageUrl ? (
        <Image src={item.product.imageUrl} alt={item.product.name} width={400} height={120}
          className="mb-3 h-28 w-full rounded-lg object-cover" />
      ) : (
        <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-gray-50 text-gray-400 dark:bg-zinc-800">
          No Image
        </div>
      )}

      {/* Product name + SKU */}
      <h3 className="font-medium text-sm line-clamp-2">{item.product.name}</h3>
      {item.product.sku && <p className="text-xs text-gray-400 mt-0.5">{item.product.sku}</p>}

      {/* Status + Condition badges */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
          {t(`status.${item.status}`)}
        </span>
        <span className="text-xs text-gray-400">{t(`condition.${item.condition}`)}</span>
      </div>

      {/* Location */}
      <p className="mt-1.5 text-xs text-gray-400">
        {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
      </p>

      {/* Barcode image */}
      <div className="mt-2 flex justify-center rounded-lg bg-gray-50 p-2 dark:bg-zinc-800">
        <Barcode value={item.barcode} height={30} width={1} fontSize={10} />
      </div>

      {/* Footer: date + print */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{new Date(item.receivedAt).toLocaleDateString()}</span>
        {onPrint && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrint(); }}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
            aria-label={t('detail.print')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

### 4.2 InventoryGrid

**File (NEW)**: `src/features/inventory/components/InventoryGrid.tsx`

```tsx
'use client';

import { InventoryCard } from './InventoryCard';
import type { InventoryItemDetail } from '../types';

interface InventoryGridProps {
  items: InventoryItemDetail[];
  onItemClick?: (id: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
}

export function InventoryGrid({ items, onItemClick, onPrint }: InventoryGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <InventoryCard
          key={item.id}
          item={item}
          onClick={onItemClick ? () => onItemClick(item.id) : undefined}
          onPrint={onPrint ? () => onPrint(item) : undefined}
        />
      ))}
    </div>
  );
}
```

### 4.3 InventoryTable 수정

**File (MODIFY)**: `src/features/inventory/components/InventoryTable.tsx`

**Changes**:
- 바코드 열에 `<Barcode>` 컴포넌트 추가 (font-mono 텍스트 대신)
- 행 클릭 핸들러 (`onItemClick`)
- 인쇄 아이콘 열 추가
- 상품 이름 클릭 시 상품 상세 (`onProductClick`)

```tsx
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { InventoryItemDetail } from '../types';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface InventoryTableProps {
  items: InventoryItemDetail[];
  onItemClick?: (id: string) => void;
  onProductClick?: (productId: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
}

export function InventoryTable({ items, onItemClick, onProductClick, onPrint }: InventoryTableProps) {
  const t = useTranslations('inventory');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.product')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.barcode')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.location')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.status')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.condition')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.receivedAt')}</th>
            <th className="px-5 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${onItemClick ? 'cursor-pointer' : ''}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {item.product.imageUrl ? (
                    <Image src={item.product.imageUrl} alt={item.product.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
                  )}
                  <div>
                    <p
                      className={`font-medium truncate max-w-[200px] ${onProductClick ? 'hover:underline cursor-pointer' : ''}`}
                      onClick={(e) => { if (onProductClick) { e.stopPropagation(); onProductClick(item.product.id); } }}
                    >
                      {item.product.name}
                    </p>
                    {item.product.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <Barcode value={item.barcode} height={24} width={1} fontSize={9} />
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
                  {t(`status.${item.status}`)}
                </span>
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{t(`condition.${item.condition}`)}</td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{new Date(item.receivedAt).toLocaleDateString()}</td>
              <td className="px-5 py-4">
                {onPrint && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPrint(item); }}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800"
                    aria-label={t('detail.print')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 5. Sprint 3: 상세 패널 + 상품 연동 + i18n

### 5.1 InventoryDetailPanel

**File (NEW)**: `src/features/inventory/components/InventoryDetailPanel.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import type { InventoryItemDetail } from '../types';

interface InventoryDetailPanelProps {
  item: InventoryItemDetail | null;
  onClose: () => void;
  onProductClick?: (productId: string) => void;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function InventoryDetailPanel({ item, onClose, onProductClick }: InventoryDetailPanelProps) {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (item) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 transition-opacity" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={tCommon('button.close')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Barcode (large) */}
          <div className="flex justify-center rounded-lg bg-gray-50 p-4 dark:bg-zinc-800">
            <Barcode value={item.barcode} height={50} width={2} fontSize={14} />
          </div>

          {/* Product info (clickable) */}
          <div
            className={`flex items-center gap-4 rounded-xl border border-gray-100 p-4 dark:border-zinc-800 ${onProductClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50' : ''}`}
            onClick={() => onProductClick?.(item.product.id)}
          >
            {item.product.imageUrl ? (
              <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-zinc-800" />
            )}
            <div>
              <p className="font-medium">{item.product.name}</p>
              {item.product.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
              {onProductClick && <p className="text-xs text-blue-500 mt-0.5">{t('detail.viewProduct')}</p>}
            </div>
          </div>

          {/* Item details */}
          <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">{t('detail.itemInfo')}</h3>
            <div className="grid grid-cols-2 gap-y-3">
              <DetailRow label={t('table.status')}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
                  {t(`status.${item.status}`)}
                </span>
              </DetailRow>
              <DetailRow label={t('table.condition')} value={t(`condition.${item.condition}`)} />
              <DetailRow label={t('table.location')} value={item.location ? `${item.location.name} (${item.location.code})` : '\u2014'} />
              <DetailRow label={t('table.receivedAt')} value={new Date(item.receivedAt).toLocaleDateString()} />
              {item.soldAt && <DetailRow label={t('detail.soldAt')} value={new Date(item.soldAt).toLocaleDateString()} />}
              {item.notes && <DetailRow label={t('detail.notes')} value={item.notes} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <>
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
      {children ?? <span className="text-sm font-medium">{value ?? '\u2014'}</span>}
    </>
  );
}
```

### 5.2 Register Page — 디버그 제거

**File (MODIFY)**: `src/app/(dashboard)/inventory/register/page.tsx`

**Changes**: Remove `debugLog` state, `scanError` destructure, and the entire debug panel `<div>` at bottom.

### 5.3 Inventory Page — Sprint 3 통합

**File (MODIFY)**: `src/app/(dashboard)/inventory/page.tsx`

Sprint 3에서 추가:
- `selectedItemId` state + `InventoryDetailPanel`
- `selectedProductId` state + `ProductDetailPanel` (products에서 import)
- `LabelPrintView` for print
- view === 'card' → `<InventoryGrid>`
- `onItemClick`, `onProductClick`, `onPrint` 핸들러 연결

### 5.4 i18n 키 추가

**File (MODIFY)**: `src/messages/en/inventory.json`

```json
{
  "view": {
    "list": "List",
    "card": "Card"
  },
  "sort": {
    "newestFirst": "Newest First",
    "oldestFirst": "Oldest First",
    "nameAsc": "Name A-Z",
    "nameDesc": "Name Z-A",
    "barcodeAsc": "Barcode A-Z",
    "statusAsc": "Status"
  },
  "filter": {
    "allStatuses": "All Statuses",
    "allLocations": "All Locations",
    "allStores": "All Stores",
    "allVendors": "All Vendors"
  },
  "detail": {
    "itemInfo": "Item Information",
    "viewProduct": "View product details →",
    "soldAt": "Sold At",
    "notes": "Notes",
    "print": "Print Label"
  },
  "pagination": {
    "showing": "Showing {from}-{to} of {total}",
    "previous": "Previous",
    "next": "Next",
    "page": "Page {current} of {total}"
  }
}
```

**File (MODIFY)**: `src/messages/ko/inventory.json`

```json
{
  "view": {
    "list": "리스트",
    "card": "카드"
  },
  "sort": {
    "newestFirst": "최신순",
    "oldestFirst": "오래된순",
    "nameAsc": "이름 A-Z",
    "nameDesc": "이름 Z-A",
    "barcodeAsc": "바코드순",
    "statusAsc": "상태순"
  },
  "filter": {
    "allStatuses": "전체 상태",
    "allLocations": "전체 위치",
    "allStores": "전체 몰",
    "allVendors": "전체 벤더"
  },
  "detail": {
    "itemInfo": "아이템 정보",
    "viewProduct": "상품 상세 보기 →",
    "soldAt": "판매일",
    "notes": "메모",
    "print": "라벨 인쇄"
  },
  "pagination": {
    "showing": "{total}개 중 {from}-{to}",
    "previous": "이전",
    "next": "다음",
    "page": "{total}페이지 중 {current}"
  }
}
```

Note: These keys are **merged** into existing inventory.json (not replacing). Existing keys like `status.*`, `condition.*`, `table.*`, `scan.*`, `register.*` remain unchanged.

---

## 6. Implementation Order

### Sprint 1 (7 files)
1. `types/index.ts` — Add schemas + interfaces
2. `api/inventory/route.ts` — Add filters
3. `src/components/ViewToggle.tsx` — New common component
4. `products/ViewToggle.tsx` — Re-export wrapper
5. `InventorySearch.tsx` — New
6. `InventoryFilters.tsx` — New
7. `inventory/page.tsx` — Integrate all

### Sprint 2 (3 files)
1. `InventoryCard.tsx` — New
2. `InventoryGrid.tsx` — New
3. `InventoryTable.tsx` — Modify (barcode + print + click)

### Sprint 3 (4 files)
1. `InventoryDetailPanel.tsx` — New
2. `inventory/register/page.tsx` — Remove debug
3. `inventory/page.tsx` — Final integration (detail panels + card view + print)
4. `messages/en+ko/inventory.json` — i18n keys

---

## 7. Verification Checklist

- [ ] `npm run build` 성공
- [ ] 검색 디바운스 (300ms) 동작
- [ ] 필터: 상태, 위치, 몰, 벤더 모두 동작
- [ ] 정렬 6종 동작
- [ ] 뷰 토글: 리스트 ↔ 카드 전환
- [ ] 카드뷰에 바코드 이미지 표시
- [ ] 테이블 바코드 열에 `<Barcode>` 이미지
- [ ] 행/카드 클릭 → InventoryDetailPanel 표시
- [ ] 상품 이름 클릭 → ProductDetailPanel 표시
- [ ] 인쇄 아이콘 → LabelPrintView
- [ ] 숫자 페이지네이션 (최대 5개)
- [ ] 디버그 패널 제거됨
- [ ] i18n en/ko 전체 키 동작
- [ ] Products 페이지 ViewToggle 깨지지 않음

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-08 | Initial design | BDJ Team |
