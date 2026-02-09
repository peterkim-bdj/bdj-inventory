# Phase 0-3: Vendor Data Management Design Document

> **Summary**: Vendor CRUD, Sheet Import, List/Card View UI with search/filter/sort, Detail page with products
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-09
> **Status**: Draft
> **Planning Doc**: [Phase0-3.plan.md](../../01-plan/features/Phase0-3.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- Follow established patterns from Inventory/Products pages (consistent UX)
- No schema changes — use existing Vendor model from Phase 0-1
- Reuse common components: `SmartSearchInput`, `ViewToggle`, pagination pattern
- ADMIN-only write operations, USER can view (read-only)
- Full i18n (EN/KO) via `vendors` namespace

### 1.2 Design Principles

- Products/Inventory page patterns (same UX, same styling)
- Feature-based module structure (`src/features/vendors/`)
- Zod validation on all API inputs
- `requireAuth()` for route protection

---

## 2. File Change Summary

| # | Type | File | Sprint |
|---|------|------|:------:|
| 1 | NEW | `src/features/vendors/types/index.ts` | 1 |
| 2 | NEW | `src/app/api/vendors/route.ts` | 1 |
| 3 | NEW | `src/app/api/vendors/[id]/route.ts` | 1 |
| 4 | NEW | `src/features/vendors/hooks/useVendors.ts` | 1 |
| 5 | NEW | `src/features/vendors/hooks/useVendor.ts` | 1 |
| 6 | NEW | `src/features/vendors/hooks/useVendorMutation.ts` | 1 |
| 7 | NEW | `src/features/vendors/components/VendorTable.tsx` | 1 |
| 8 | NEW | `src/features/vendors/components/VendorCard.tsx` | 1 |
| 9 | NEW | `src/features/vendors/components/VendorGrid.tsx` | 1 |
| 10 | NEW | `src/features/vendors/components/VendorFilters.tsx` | 1 |
| 11 | NEW | `src/app/(dashboard)/vendors/page.tsx` | 1 |
| 12 | MODIFY | `src/app/(dashboard)/DashboardShell.tsx` | 1 |
| 13 | NEW | `src/features/vendors/components/VendorForm.tsx` | 2 |
| 14 | NEW | `src/features/vendors/components/VendorDetail.tsx` | 2 |
| 15 | NEW | `src/features/vendors/components/VendorProductList.tsx` | 2 |
| 16 | NEW | `src/app/(dashboard)/vendors/new/page.tsx` | 2 |
| 17 | NEW | `src/app/(dashboard)/vendors/[id]/page.tsx` | 2 |
| 18 | NEW | `src/app/(dashboard)/vendors/[id]/edit/page.tsx` | 2 |
| 19 | NEW | `src/features/vendors/hooks/useVendorImport.ts` | 3 |
| 20 | NEW | `src/features/vendors/components/VendorImportUpload.tsx` | 3 |
| 21 | NEW | `src/features/vendors/components/VendorImportPreview.tsx` | 3 |
| 22 | NEW | `src/features/vendors/components/VendorImportResult.tsx` | 3 |
| 23 | NEW | `src/app/api/vendors/import/route.ts` | 3 |
| 24 | NEW | `src/app/api/vendors/import/template/route.ts` | 3 |
| 25 | NEW | `src/app/(dashboard)/vendors/import/page.tsx` | 3 |
| 26 | NEW | `src/messages/en/vendors.json` | 4 |
| 27 | NEW | `src/messages/ko/vendors.json` | 4 |
| 28 | MODIFY | `src/i18n/request.ts` | 4 |
| 29 | MODIFY | `src/middleware.ts` | 1 |
| **Total** | **26 NEW + 3 MODIFY** | **29 files** | |

---

## 3. Sprint 1: Vendor CRUD API + List UI

### 3.1 Types

**File (NEW)**: `src/features/vendors/types/index.ts`

```typescript
import { z } from 'zod';

// === API Query Schema ===

export const vendorQuerySchema = z.object({
  search: z.string().optional(),
  hasContact: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  autoNotify: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'productCount', 'minLeadDays', 'contactStatus']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// === Create/Update Schema ===

export const vendorCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional().nullable(),
  contactName: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  website: z.string().url().max(500).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  autoNotify: z.boolean().optional().default(false),
  minLeadDays: z.coerce.number().int().min(0).max(365).optional().default(3),
});

export const vendorUpdateSchema = vendorCreateSchema.partial().omit({ name: true }).extend({
  name: z.string().min(1).max(255).optional(),
});

// === Interfaces ===

export interface VendorListItem {
  id: string;
  name: string;
  code: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  autoNotify: boolean;
  minLeadDays: number;
  isActive: boolean;
  hasContact: boolean; // computed: has phone or email
  _count: { products: number };
}

export interface VendorDetail extends VendorListItem {
  website: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    imageUrl: string | null;
    price: string | null;
    productType: string | null;
    _count: { inventoryItems: number };
  }>;
}

export interface VendorImportRow {
  name: string;
  code?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  notes?: string;
  minLeadDays?: number;
}

export interface VendorImportPreviewRow extends VendorImportRow {
  rowNumber: number;
  status: 'new' | 'duplicate' | 'error';
  errors: Array<{ field: string; message: string }>;
}

export interface VendorImportResult {
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{ row: number; field: string; message: string }>;
}
```

### 3.2 Vendor List API

**File (NEW)**: `src/app/api/vendors/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { vendorQuerySchema, vendorCreateSchema } from '@/features/vendors/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = vendorQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, hasContact, isActive, autoNotify, sortBy, sortOrder, page, limit } = parsed.data;

  const where: Prisma.VendorWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (hasContact === 'true') {
    where.OR = [
      ...(where.OR ? [] : []),
      { phone: { not: null } },
      { email: { not: null } },
    ];
    // Override: if search is also set, use AND
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        },
        {
          OR: [{ phone: { not: null } }, { email: { not: null } }],
        },
      ];
      delete where.OR;
    }
  } else if (hasContact === 'false') {
    where.phone = null;
    where.email = null;
  }

  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (autoNotify !== undefined) where.autoNotify = autoNotify === 'true';

  // Sort
  let orderBy: Prisma.VendorOrderByWithRelationInput | Prisma.VendorOrderByWithRelationInput[];
  const dir = sortOrder ?? 'asc';

  if (sortBy === 'productCount') {
    orderBy = { products: { _count: dir } };
  } else if (sortBy === 'minLeadDays') {
    orderBy = { minLeadDays: dir };
  } else if (sortBy === 'contactStatus') {
    // Missing contact first (nulls first for asc)
    orderBy = [{ phone: dir === 'asc' ? 'asc' : 'desc' }, { name: 'asc' }];
  } else {
    orderBy = { name: dir };
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        contactName: true,
        phone: true,
        email: true,
        autoNotify: true,
        minLeadDays: true,
        isActive: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  // Add computed hasContact field
  const items = vendors.map((v) => ({
    ...v,
    hasContact: !!(v.phone || v.email),
  }));

  return NextResponse.json({
    vendors: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const body = await request.json();
  const parsed = vendorCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  // Clean empty strings to null
  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );

  try {
    const vendor = await prisma.vendor.create({ data: data as Prisma.VendorCreateInput });
    return NextResponse.json(vendor, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return apiError('CONFLICT', 'Vendor name already exists', 409);
    }
    throw err;
  }
}
```

### 3.3 Vendor Detail/Update/Delete API

**File (NEW)**: `src/app/api/vendors/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { vendorUpdateSchema } from '@/features/vendors/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          sku: true,
          imageUrl: true,
          price: true,
          productType: true,
          _count: { select: { inventoryItems: true } },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { products: true } },
    },
  });

  if (!vendor) {
    return apiError('NOT_FOUND', 'Vendor not found', 404);
  }

  return NextResponse.json({
    ...vendor,
    hasContact: !!(vendor.phone || vendor.email),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = vendorUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );

  try {
    const vendor = await prisma.vendor.update({
      where: { id },
      data: data as Prisma.VendorUpdateInput,
    });
    return NextResponse.json(vendor);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('not found')) {
      return apiError('NOT_FOUND', 'Vendor not found', 404);
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return apiError('CONFLICT', 'Vendor name already exists', 409);
    }
    throw err;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return apiError('NOT_FOUND', 'Vendor not found', 404);
  }
}
```

### 3.4 Hooks

**File (NEW)**: `src/features/vendors/hooks/useVendors.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

interface UseVendorsParams {
  search?: string;
  hasContact?: string;
  isActive?: string;
  autoNotify?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

async function fetchVendors(params: UseVendorsParams) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const res = await fetch(`/api/vendors?${sp}`);
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
}

export function useVendors(params: UseVendorsParams = {}) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: () => fetchVendors(params),
  });
}
```

**File (NEW)**: `src/features/vendors/hooks/useVendor.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchVendor(id: string) {
  const res = await fetch(`/api/vendors/${id}`);
  if (!res.ok) throw new Error('Failed to fetch vendor');
  return res.json();
}

export function useVendor(id: string | null) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: () => fetchVendor(id!),
    enabled: !!id,
  });
}
```

**File (NEW)**: `src/features/vendors/hooks/useVendorMutation.ts`

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create vendor');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update vendor');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor'] });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete vendor');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}
```

### 3.5 VendorTable

**File (NEW)**: `src/features/vendors/components/VendorTable.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { VendorListItem } from '../types';

interface VendorTableProps {
  vendors: VendorListItem[];
  onVendorClick?: (id: string) => void;
}

export function VendorTable({ vendors, onVendorClick }: VendorTableProps) {
  const t = useTranslations('vendors');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.name')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.contact')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.phone')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.email')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.products')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.leadTime')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.status')}</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr
              key={vendor.id}
              onClick={() => onVendorClick?.(vendor.id)}
              className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${onVendorClick ? 'cursor-pointer' : ''}`}
            >
              <td className="px-5 py-4">
                <div>
                  <p className="font-medium">{vendor.name}</p>
                  {vendor.code && <p className="text-xs text-gray-400">{vendor.code}</p>}
                </div>
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {vendor.contactName || (
                  <span className="text-orange-400 text-xs">{t('missingContact')}</span>
                )}
              </td>
              <td className="px-5 py-4">
                {vendor.phone ? (
                  <a
                    href={`tel:${vendor.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {vendor.phone}
                  </a>
                ) : (
                  <span className="text-gray-300 dark:text-zinc-600">&mdash;</span>
                )}
              </td>
              <td className="px-5 py-4">
                {vendor.email ? (
                  <a
                    href={`mailto:${vendor.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {vendor.email}
                  </a>
                ) : (
                  <span className="text-gray-300 dark:text-zinc-600">&mdash;</span>
                )}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {vendor._count.products}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {t('leadTimeDays', { days: vendor.minLeadDays })}
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  vendor.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
                }`}>
                  {vendor.isActive ? t('active') : t('inactive')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 3.6 VendorCard + VendorGrid

**File (NEW)**: `src/features/vendors/components/VendorCard.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { VendorListItem } from '../types';

interface VendorCardProps {
  vendor: VendorListItem;
  onClick?: () => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  const t = useTranslations('vendors');

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Header: name + status */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{vendor.name}</h3>
          {vendor.code && <p className="text-xs text-gray-400 mt-0.5">{vendor.code}</p>}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          vendor.isActive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
        }`}>
          {vendor.isActive ? t('active') : t('inactive')}
        </span>
      </div>

      {/* Contact info */}
      <div className="mt-3 space-y-1.5">
        {vendor.contactName ? (
          <p className="text-sm text-gray-600 dark:text-zinc-400">{vendor.contactName}</p>
        ) : (
          <p className="text-sm text-orange-400">{t('missingContact')}</p>
        )}

        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400">
            <span>📞</span> {vendor.phone}
          </a>
        )}

        {vendor.email && (
          <a href={`mailto:${vendor.email}`} onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400">
            <span>📧</span> {vendor.email}
          </a>
        )}
      </div>

      {/* Footer: products + lead time */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{t('productCount', { count: vendor._count.products })}</span>
        <span>{t('leadTimeDays', { days: vendor.minLeadDays })}</span>
      </div>
    </div>
  );
}
```

**File (NEW)**: `src/features/vendors/components/VendorGrid.tsx`

```tsx
'use client';

import { VendorCard } from './VendorCard';
import type { VendorListItem } from '../types';

interface VendorGridProps {
  vendors: VendorListItem[];
  onVendorClick?: (id: string) => void;
}

export function VendorGrid({ vendors, onVendorClick }: VendorGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {vendors.map((vendor) => (
        <VendorCard
          key={vendor.id}
          vendor={vendor}
          onClick={onVendorClick ? () => onVendorClick(vendor.id) : undefined}
        />
      ))}
    </div>
  );
}
```

### 3.7 VendorFilters

**File (NEW)**: `src/features/vendors/components/VendorFilters.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';

interface VendorFiltersProps {
  selectedHasContact: string;
  selectedIsActive: string;
  selectedAutoNotify: string;
  onHasContactChange: (val: string) => void;
  onIsActiveChange: (val: string) => void;
  onAutoNotifyChange: (val: string) => void;
}

export function VendorFilters({
  selectedHasContact,
  selectedIsActive,
  selectedAutoNotify,
  onHasContactChange,
  onIsActiveChange,
  onAutoNotifyChange,
}: VendorFiltersProps) {
  const t = useTranslations('vendors');

  const selectClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400';

  return (
    <>
      <select value={selectedHasContact} onChange={(e) => onHasContactChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allContact')}</option>
        <option value="true">{t('filter.hasContact')}</option>
        <option value="false">{t('filter.missingContact')}</option>
      </select>

      <select value={selectedIsActive} onChange={(e) => onIsActiveChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allStatus')}</option>
        <option value="true">{t('filter.active')}</option>
        <option value="false">{t('filter.inactive')}</option>
      </select>

      <select value={selectedAutoNotify} onChange={(e) => onAutoNotifyChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allNotify')}</option>
        <option value="true">{t('filter.notifyOn')}</option>
        <option value="false">{t('filter.notifyOff')}</option>
      </select>
    </>
  );
}
```

### 3.8 Vendors Page

**File (NEW)**: `src/app/(dashboard)/vendors/page.tsx`

```tsx
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
          <ViewToggle view={view} onViewChange={setView} listLabel={t('view.list')} cardLabel={t('view.card')} />
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
```

### 3.9 Dashboard Nav Update

**File (MODIFY)**: `src/app/(dashboard)/DashboardShell.tsx`

**Change**: Add "Vendors" nav link visible to all roles, positioned between Products and Inventory.

```tsx
// Add after Products link, before Inventory link:
<Link href="/vendors" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
  {t('nav.vendors')}
</Link>
```

### 3.10 Middleware Update

**File (MODIFY)**: `src/middleware.ts`

**Change**: No changes needed. `/vendors` is not in `adminOnlyPaths` and not in `publicPaths`, so authenticated users (USER, ADMIN) can access it. Write operations are protected at API level via `requireAuth('ADMIN')`.

---

## 4. Sprint 2: Vendor Create/Edit/Detail

### 4.1 VendorForm (Shared Create/Edit)

**File (NEW)**: `src/features/vendors/components/VendorForm.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateVendor, useUpdateVendor } from '../hooks/useVendorMutation';
import type { VendorDetail } from '../types';

interface VendorFormProps {
  vendor?: VendorDetail; // undefined = create mode
}

export function VendorForm({ vendor }: VendorFormProps) {
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const isEdit = !!vendor;

  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    code: vendor?.code ?? '',
    contactName: vendor?.contactName ?? '',
    phone: vendor?.phone ?? '',
    email: vendor?.email ?? '',
    website: vendor?.website ?? '',
    address: vendor?.address ?? '',
    notes: vendor?.notes ?? '',
    autoNotify: vendor?.autoNotify ?? false,
    minLeadDays: vendor?.minLeadDays ?? 3,
  });
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: vendor.id, data: form });
        router.push(`/vendors/${vendor.id}`);
      } else {
        const created = await createMutation.mutateAsync(form);
        router.push(`/vendors/${created.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name (required) */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.name')} *</label>
        <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
          required className={inputClass} />
      </div>

      {/* Code */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.code')}</label>
        <input type="text" value={form.code} onChange={(e) => handleChange('code', e.target.value)}
          placeholder="e.g., NK-KR" className={inputClass} />
      </div>

      {/* Contact Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.contactName')}</label>
        <input type="text" value={form.contactName} onChange={(e) => handleChange('contactName', e.target.value)}
          className={inputClass} />
      </div>

      {/* Phone + Email row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.phone')}</label>
          <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
            className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.email')}</label>
          <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
            className={inputClass} />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.website')}</label>
        <input type="url" value={form.website} onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://" className={inputClass} />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.address')}</label>
        <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)}
          className={inputClass} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)}
          rows={3} placeholder={t('form.notesPlaceholder')} className={inputClass} />
      </div>

      {/* Lead time + Auto notify row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.minLeadDays')}</label>
          <input type="number" value={form.minLeadDays} min={0} max={365}
            onChange={(e) => handleChange('minLeadDays', parseInt(e.target.value) || 0)}
            className={inputClass} />
        </div>
        <div className="flex items-center pt-7">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.autoNotify}
              onChange={(e) => handleChange('autoNotify', e.target.checked)}
              className="rounded border-gray-300" />
            {t('form.autoNotify')}
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <button type="submit" disabled={isPending}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200">
          {isPending ? tCommon('status.saving') : isEdit ? tCommon('button.save') : t('addVendor')}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {tCommon('button.cancel')}
        </button>
      </div>
    </form>
  );
}
```

### 4.2 VendorDetail + VendorProductList

**File (NEW)**: `src/features/vendors/components/VendorDetail.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDeleteVendor } from '../hooks/useVendorMutation';
import { VendorProductList } from './VendorProductList';
import type { VendorDetail as VendorDetailType } from '../types';

interface VendorDetailProps {
  vendor: VendorDetailType;
}

export function VendorDetail({ vendor }: VendorDetailProps) {
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const deleteMutation = useDeleteVendor();

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return;
    await deleteMutation.mutateAsync(vendor.id);
    router.push('/vendors');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              vendor.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
            }`}>
              {vendor.isActive ? t('active') : t('inactive')}
            </span>
          </div>
          {vendor.code && <p className="text-sm text-gray-400 mt-1">{vendor.code}</p>}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/vendors/${vendor.id}/edit`)}
              className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              {tCommon('button.edit')}
            </button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending}
              className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
              {tCommon('button.delete')}
            </button>
          </div>
        )}
      </div>

      {/* Contact Info Card */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">{t('detail.contactInfo')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label={t('form.contactName')} value={vendor.contactName} />
          <DetailRow label={t('form.phone')}>
            {vendor.phone ? (
              <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{vendor.phone}</a>
            ) : <span className="text-gray-300">&mdash;</span>}
          </DetailRow>
          <DetailRow label={t('form.email')}>
            {vendor.email ? (
              <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline dark:text-blue-400">{vendor.email}</a>
            ) : <span className="text-gray-300">&mdash;</span>}
          </DetailRow>
          <DetailRow label={t('form.website')}>
            {vendor.website ? (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">{vendor.website}</a>
            ) : <span className="text-gray-300">&mdash;</span>}
          </DetailRow>
          <DetailRow label={t('form.address')} value={vendor.address} className="col-span-2" />
        </div>
      </div>

      {/* Settings Card */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">{t('detail.settings')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label={t('form.minLeadDays')} value={t('leadTimeDays', { days: vendor.minLeadDays })} />
          <DetailRow label={t('form.autoNotify')} value={vendor.autoNotify ? t('filter.notifyOn') : t('filter.notifyOff')} />
        </div>
        {vendor.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-sm text-gray-500 dark:text-zinc-400 whitespace-pre-wrap">{vendor.notes}</p>
          </div>
        )}
      </div>

      {/* Products */}
      <VendorProductList products={vendor.products} />
    </div>
  );
}

function DetailRow({
  label, value, children, className = '',
}: {
  label: string; value?: string | null; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {children ?? <p className="text-sm font-medium">{value || <span className="text-gray-300">&mdash;</span>}</p>}
    </div>
  );
}
```

**File (NEW)**: `src/features/vendors/components/VendorProductList.tsx`

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface VendorProduct {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  price: string | null;
  productType: string | null;
  _count: { inventoryItems: number };
}

interface VendorProductListProps {
  products: VendorProduct[];
}

export function VendorProductList({ products }: VendorProductListProps) {
  const t = useTranslations('vendors');

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('detail.products')} ({products.length})
        </h2>
      </div>
      {products.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-gray-400">
          {t('detail.noProducts')}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products?search=${encodeURIComponent(product.name)}`}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
            >
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} width={32} height={32}
                  className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-gray-400">{product.sku || product.productType || ''}</p>
              </div>
              <div className="text-right">
                {product.price && <p className="text-sm font-medium">${product.price}</p>}
                <p className="text-xs text-gray-400">{t('detail.stockCount', { count: product._count.inventoryItems })}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.3 Pages

**File (NEW)**: `src/app/(dashboard)/vendors/new/page.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { VendorForm } from '@/features/vendors/components/VendorForm';

export default function VendorCreatePage() {
  const t = useTranslations('vendors');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendors" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          &larr;
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('createTitle')}</h1>
      </div>
      <VendorForm />
    </div>
  );
}
```

**File (NEW)**: `src/app/(dashboard)/vendors/[id]/page.tsx`

```tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVendor } from '@/features/vendors/hooks/useVendor';
import { VendorDetail } from '@/features/vendors/components/VendorDetail';

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const { data: vendor, isLoading } = useVendor(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-gray-400">{tCommon('error.notFound')}</p>
        <Link href="/vendors" className="mt-4 text-sm text-blue-600 hover:underline">{t('backToList')}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/vendors" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        &larr; {t('backToList')}
      </Link>
      <VendorDetail vendor={vendor} />
    </div>
  );
}
```

**File (NEW)**: `src/app/(dashboard)/vendors/[id]/edit/page.tsx`

```tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVendor } from '@/features/vendors/hooks/useVendor';
import { VendorForm } from '@/features/vendors/components/VendorForm';

export default function VendorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const { data: vendor, isLoading } = useVendor(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-gray-400">{tCommon('error.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/vendors/${id}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          &larr;
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('editTitle')}</h1>
      </div>
      <VendorForm vendor={vendor} />
    </div>
  );
}
```

---

## 5. Sprint 3: Sheet Import

### 5.1 Import Hook

**File (NEW)**: `src/features/vendors/hooks/useVendorImport.ts`

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VendorImportPreviewRow, VendorImportResult } from '../types';

export function useVendorImport() {
  const qc = useQueryClient();
  const [previewRows, setPreviewRows] = useState<VendorImportPreviewRow[] | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const parseMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('action', 'preview');

      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse file');
      }
      return res.json() as Promise<{ rows: VendorImportPreviewRow[] }>;
    },
    onSuccess: (data) => {
      setPreviewRows(data.rows);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (options: { duplicateAction: 'skip' | 'update'; emptyValueAction: 'ignore' | 'overwrite' }) => {
      if (!file) throw new Error('No file selected');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'execute');
      formData.append('duplicateAction', options.duplicateAction);
      formData.append('emptyValueAction', options.emptyValueAction);

      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      return res.json() as Promise<VendorImportResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewRows(null);
    parseMutation.mutate(selectedFile);
  };

  const reset = () => {
    setFile(null);
    setPreviewRows(null);
  };

  return {
    file,
    previewRows,
    isParsing: parseMutation.isPending,
    parseError: parseMutation.error?.message,
    isImporting: importMutation.isPending,
    importResult: importMutation.data,
    importError: importMutation.error?.message,
    handleFileSelect,
    executeImport: importMutation.mutate,
    reset,
  };
}
```

### 5.2 Import API

**File (NEW)**: `src/app/api/vendors/import/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { read, utils } from 'xlsx';

const EXPECTED_COLUMNS = ['name', 'code', 'contactName', 'phone', 'email', 'website', 'address', 'notes', 'minLeadDays'];

function parseSheet(buffer: ArrayBuffer) {
  const workbook = read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  // Auto-detect column mapping
  const headers = Object.keys(rows[0] || {});
  const mapping: Record<string, string> = {};

  for (const expected of EXPECTED_COLUMNS) {
    const found = headers.find((h) =>
      h.toLowerCase().replace(/[\s_-]/g, '') === expected.toLowerCase()
    );
    if (found) mapping[expected] = found;
  }

  return rows.map((row, i) => {
    const mapped: Record<string, string | number> = {};
    for (const [target, source] of Object.entries(mapping)) {
      const val = row[source];
      if (target === 'minLeadDays') {
        mapped[target] = typeof val === 'number' ? val : parseInt(String(val)) || 3;
      } else {
        mapped[target] = String(val || '').trim();
      }
    }
    return { ...mapped, rowNumber: i + 2 }; // +2 for header row + 1-indexed
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const action = formData.get('action') as string;

  if (!file) {
    return apiError('VALIDATION_ERROR', 'No file provided', 400);
  }

  const buffer = await file.arrayBuffer();
  const rows = parseSheet(buffer);

  if (action === 'preview') {
    // Validate and check duplicates
    const existingVendors = await prisma.vendor.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingVendors.map((v) => v.name.toLowerCase()));

    const previewRows = rows.map((row) => {
      const errors: Array<{ field: string; message: string }> = [];
      const name = String(row.name || '').trim();

      if (!name) {
        errors.push({ field: 'name', message: 'Name is required' });
      }

      const email = String(row.email || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }

      let status: 'new' | 'duplicate' | 'error' = 'new';
      if (errors.length > 0) status = 'error';
      else if (name && existingNames.has(name.toLowerCase())) status = 'duplicate';

      return { ...row, rowNumber: row.rowNumber as number, status, errors };
    });

    return NextResponse.json({ rows: previewRows });
  }

  // Execute import
  const duplicateAction = formData.get('duplicateAction') as string || 'skip';
  const emptyValueAction = formData.get('emptyValueAction') as string || 'ignore';

  let created = 0, updated = 0, skipped = 0, errorCount = 0;
  const importErrors: Array<{ row: number; field: string; message: string }> = [];

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) {
      errorCount++;
      importErrors.push({ row: row.rowNumber as number, field: 'name', message: 'Name is required' });
      continue;
    }

    const existing = await prisma.vendor.findUnique({ where: { name } });

    const data: Record<string, unknown> = {};
    for (const field of ['code', 'contactName', 'phone', 'email', 'website', 'address', 'notes']) {
      const val = String(row[field] || '').trim();
      if (val) {
        data[field] = val;
      } else if (emptyValueAction === 'overwrite') {
        data[field] = null;
      }
    }
    if (row.minLeadDays !== undefined) {
      data.minLeadDays = typeof row.minLeadDays === 'number' ? row.minLeadDays : 3;
    }

    try {
      if (existing) {
        if (duplicateAction === 'update') {
          await prisma.vendor.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.vendor.create({ data: { name, ...data } });
        created++;
      }
    } catch {
      errorCount++;
      importErrors.push({ row: row.rowNumber as number, field: 'name', message: 'Database error' });
    }
  }

  return NextResponse.json({
    summary: { total: rows.length, created, updated, skipped, errors: errorCount },
    errors: importErrors,
  });
}
```

### 5.3 Import Template API

**File (NEW)**: `src/app/api/vendors/import/template/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { utils, write } from 'xlsx';

export async function GET() {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const wb = utils.book_new();
  const headers = ['name', 'code', 'contactName', 'phone', 'email', 'website', 'address', 'notes', 'minLeadDays'];
  const sampleRow = ['Nike Korea', 'NK-KR', 'Kim CS', '02-1234-5678', 'kim@nike.co.kr', '', 'Seoul, Korea', 'Mon AM preferred', 3];
  const ws = utils.aoa_to_sheet([headers, sampleRow]);

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));

  utils.book_append_sheet(wb, ws, 'Vendors');
  const buf = write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="vendor-import-template.xlsx"',
    },
  });
}
```

### 5.4 Import UI Components

**File (NEW)**: `src/features/vendors/components/VendorImportUpload.tsx`

```tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';

interface VendorImportUploadProps {
  onFileSelect: (file: File) => void;
  isParsing: boolean;
}

export function VendorImportUpload({ onFileSelect, isParsing }: VendorImportUploadProps) {
  const t = useTranslations('vendors');

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) onFileSelect(accepted[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isParsing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer ${
          isDragActive
            ? 'border-black bg-gray-50 dark:border-white dark:bg-zinc-800'
            : 'border-gray-300 hover:border-gray-400 dark:border-zinc-700 dark:hover:border-zinc-500'
        } ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <p className="text-lg font-medium mb-1">
          {isDragActive ? t('import.dropHere') : t('import.dragOrClick')}
        </p>
        <p className="text-sm text-gray-400">{t('import.acceptedFormats')}</p>
      </div>

      <div className="flex justify-end">
        <a
          href="/api/vendors/import/template"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {t('import.downloadTemplate')}
        </a>
      </div>
    </div>
  );
}
```

**File (NEW)**: `src/features/vendors/components/VendorImportPreview.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { VendorImportPreviewRow } from '../types';

interface VendorImportPreviewProps {
  rows: VendorImportPreviewRow[];
  onExecute: (options: { duplicateAction: 'skip' | 'update'; emptyValueAction: 'ignore' | 'overwrite' }) => void;
  onCancel: () => void;
  isImporting: boolean;
}

const statusBadge: Record<string, string> = {
  new: 'bg-green-100 text-green-700',
  duplicate: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export function VendorImportPreview({ rows, onExecute, onCancel, isImporting }: VendorImportPreviewProps) {
  const t = useTranslations('vendors');
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [emptyValueAction, setEmptyValueAction] = useState<'ignore' | 'overwrite'>('ignore');

  const newCount = rows.filter((r) => r.status === 'new').length;
  const dupCount = rows.filter((r) => r.status === 'duplicate').length;
  const errCount = rows.filter((r) => r.status === 'error').length;

  const selectClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{t('import.newCount', { count: newCount })}</span>
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">{t('import.dupCount', { count: dupCount })}</span>
        <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{t('import.errCount', { count: errCount })}</span>
      </div>

      {/* Options */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-gray-400">{t('import.duplicateAction')}</label>
          <select value={duplicateAction} onChange={(e) => setDuplicateAction(e.target.value as 'skip' | 'update')} className={selectClass}>
            <option value="skip">{t('import.skip')}</option>
            <option value="update">{t('import.update')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">{t('import.emptyValueAction')}</label>
          <select value={emptyValueAction} onChange={(e) => setEmptyValueAction(e.target.value as 'ignore' | 'overwrite')} className={selectClass}>
            <option value="ignore">{t('import.ignoreEmpty')}</option>
            <option value="overwrite">{t('import.overwriteEmpty')}</option>
          </select>
        </div>
      </div>

      {/* Preview table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700 max-h-96">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('import.status')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.name')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.code')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.contactName')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.phone')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.email')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-zinc-800">
                <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[row.status]}`}>
                    {t(`import.${row.status}`)}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-gray-500">{row.code || ''}</td>
                <td className="px-3 py-2 text-gray-500">{row.contactName || ''}</td>
                <td className="px-3 py-2 text-gray-500">{row.phone || ''}</td>
                <td className="px-3 py-2 text-gray-500">{row.email || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onExecute({ duplicateAction, emptyValueAction })}
          disabled={isImporting || errCount === rows.length}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {isImporting ? t('import.importing') : t('import.execute')}
        </button>
        <button onClick={onCancel}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {t('import.cancel')}
        </button>
      </div>
    </div>
  );
}
```

**File (NEW)**: `src/features/vendors/components/VendorImportResult.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { VendorImportResult as VendorImportResultType } from '../types';

interface VendorImportResultProps {
  result: VendorImportResultType;
  onReset: () => void;
}

export function VendorImportResult({ result, onReset }: VendorImportResultProps) {
  const t = useTranslations('vendors');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-800">
        <h3 className="text-lg font-bold mb-4">{t('import.resultTitle')}</h3>
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{result.summary.total}</p>
            <p className="text-xs text-gray-400">{t('import.total')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{result.summary.created}</p>
            <p className="text-xs text-gray-400">{t('import.created')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{result.summary.updated}</p>
            <p className="text-xs text-gray-400">{t('import.updated')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{result.summary.skipped}</p>
            <p className="text-xs text-gray-400">{t('import.skipped')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{result.summary.errors}</p>
            <p className="text-xs text-gray-400">{t('import.errors')}</p>
          </div>
        </div>
      </div>

      {/* Error details */}
      {result.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 p-4 dark:border-red-800">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">{t('import.errorDetails')}</h4>
          <ul className="text-sm space-y-1">
            {result.errors.map((err, i) => (
              <li key={i} className="text-red-600 dark:text-red-400">
                Row {err.row}: {err.field} - {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href="/vendors"
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
          {t('backToList')}
        </Link>
        <button onClick={onReset}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {t('import.importAnother')}
        </button>
      </div>
    </div>
  );
}
```

### 5.5 Import Page

**File (NEW)**: `src/app/(dashboard)/vendors/import/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVendorImport } from '@/features/vendors/hooks/useVendorImport';
import { VendorImportUpload } from '@/features/vendors/components/VendorImportUpload';
import { VendorImportPreview } from '@/features/vendors/components/VendorImportPreview';
import { VendorImportResult } from '@/features/vendors/components/VendorImportResult';

export default function VendorImportPage() {
  const t = useTranslations('vendors');
  const {
    previewRows,
    isParsing,
    parseError,
    isImporting,
    importResult,
    importError,
    handleFileSelect,
    executeImport,
    reset,
  } = useVendorImport();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/vendors" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          &larr;
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('import.title')}</h1>
      </div>

      {(parseError || importError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {parseError || importError}
        </div>
      )}

      {importResult ? (
        <VendorImportResult result={importResult} onReset={reset} />
      ) : previewRows ? (
        <VendorImportPreview
          rows={previewRows}
          onExecute={executeImport}
          onCancel={reset}
          isImporting={isImporting}
        />
      ) : (
        <VendorImportUpload onFileSelect={handleFileSelect} isParsing={isParsing} />
      )}
    </div>
  );
}
```

---

## 6. Sprint 4: i18n

### 6.1 EN Translation

**File (NEW)**: `src/messages/en/vendors.json`

```json
{
  "title": "Vendors",
  "totalCount": "{count} vendors",
  "addVendor": "Add Vendor",
  "createTitle": "New Vendor",
  "editTitle": "Edit Vendor",
  "backToList": "Back to Vendors",
  "noVendors": "No vendors found",
  "missingContact": "Missing contact",
  "active": "Active",
  "inactive": "Inactive",
  "leadTimeDays": "{days}d lead",
  "productCount": "{count} products",
  "deleteConfirm": "Are you sure you want to deactivate this vendor?",
  "view": {
    "list": "List",
    "card": "Card"
  },
  "search": {
    "placeholder": "Search by name, contact, code..."
  },
  "filter": {
    "allContact": "All Contact Status",
    "hasContact": "Has Contact",
    "missingContact": "Missing Contact",
    "allStatus": "All Status",
    "active": "Active",
    "inactive": "Inactive",
    "allNotify": "All Notify",
    "notifyOn": "Notify ON",
    "notifyOff": "Notify OFF"
  },
  "sort": {
    "missingFirst": "Missing Contact First",
    "nameAsc": "Name A-Z",
    "nameDesc": "Name Z-A",
    "mostProducts": "Most Products",
    "shortestLead": "Shortest Lead Time"
  },
  "table": {
    "name": "Vendor",
    "contact": "Contact",
    "phone": "Phone",
    "email": "Email",
    "products": "Products",
    "leadTime": "Lead Time",
    "status": "Status"
  },
  "form": {
    "name": "Vendor Name",
    "code": "Internal Code",
    "contactName": "Contact Person",
    "phone": "Phone",
    "email": "Email",
    "website": "Website",
    "address": "Address",
    "notes": "Notes",
    "notesPlaceholder": "e.g., Prefer morning calls on Monday",
    "minLeadDays": "Lead Time (days)",
    "autoNotify": "Auto Notify"
  },
  "detail": {
    "contactInfo": "Contact Information",
    "settings": "Settings",
    "products": "Products by this Vendor",
    "noProducts": "No products from this vendor",
    "stockCount": "{count} in stock"
  },
  "pagination": {
    "showing": "Showing {from}-{to} of {total}"
  },
  "import": {
    "title": "Import Vendors",
    "dragOrClick": "Drag & drop a file, or click to browse",
    "dropHere": "Drop file here",
    "acceptedFormats": "Accepts CSV, XLSX",
    "downloadTemplate": "Download template (XLSX)",
    "status": "Status",
    "new": "New",
    "duplicate": "Duplicate",
    "error": "Error",
    "newCount": "{count} new",
    "dupCount": "{count} duplicates",
    "errCount": "{count} errors",
    "duplicateAction": "Duplicate handling",
    "skip": "Skip",
    "update": "Update",
    "emptyValueAction": "Empty values",
    "ignoreEmpty": "Keep existing",
    "overwriteEmpty": "Overwrite with empty",
    "execute": "Import Now",
    "importing": "Importing...",
    "cancel": "Cancel",
    "resultTitle": "Import Complete",
    "total": "Total",
    "created": "Created",
    "updated": "Updated",
    "skipped": "Skipped",
    "errors": "Errors",
    "errorDetails": "Error Details",
    "importAnother": "Import Another File"
  }
}
```

### 6.2 KO Translation

**File (NEW)**: `src/messages/ko/vendors.json`

```json
{
  "title": "벤더",
  "totalCount": "{count}개 벤더",
  "addVendor": "벤더 추가",
  "createTitle": "새 벤더",
  "editTitle": "벤더 수정",
  "backToList": "벤더 목록으로",
  "noVendors": "벤더가 없습니다",
  "missingContact": "연락처 미입력",
  "active": "활성",
  "inactive": "비활성",
  "leadTimeDays": "{days}일 리드타임",
  "productCount": "{count}개 상품",
  "deleteConfirm": "이 벤더를 비활성화하시겠습니까?",
  "view": {
    "list": "리스트",
    "card": "카드"
  },
  "search": {
    "placeholder": "이름, 담당자, 코드로 검색..."
  },
  "filter": {
    "allContact": "전체 연락처",
    "hasContact": "연락처 있음",
    "missingContact": "연락처 미입력",
    "allStatus": "전체 상태",
    "active": "활성",
    "inactive": "비활성",
    "allNotify": "전체 알림",
    "notifyOn": "알림 ON",
    "notifyOff": "알림 OFF"
  },
  "sort": {
    "missingFirst": "연락처 미입력 우선",
    "nameAsc": "이름 A-Z",
    "nameDesc": "이름 Z-A",
    "mostProducts": "상품 많은순",
    "shortestLead": "리드타임 짧은순"
  },
  "table": {
    "name": "벤더",
    "contact": "담당자",
    "phone": "전화번호",
    "email": "이메일",
    "products": "상품 수",
    "leadTime": "리드타임",
    "status": "상태"
  },
  "form": {
    "name": "벤더명",
    "code": "내부 코드",
    "contactName": "담당자명",
    "phone": "전화번호",
    "email": "이메일",
    "website": "웹사이트",
    "address": "주소",
    "notes": "메모",
    "notesPlaceholder": "예: 월요일 오전 연락 선호",
    "minLeadDays": "리드타임 (일)",
    "autoNotify": "자동 알림"
  },
  "detail": {
    "contactInfo": "연락처 정보",
    "settings": "설정",
    "products": "이 벤더의 상품",
    "noProducts": "이 벤더의 상품이 없습니다",
    "stockCount": "재고 {count}개"
  },
  "pagination": {
    "showing": "{total}개 중 {from}-{to}"
  },
  "import": {
    "title": "벤더 가져오기",
    "dragOrClick": "파일을 드래그하거나 클릭하여 선택",
    "dropHere": "여기에 놓으세요",
    "acceptedFormats": "CSV, XLSX 지원",
    "downloadTemplate": "템플릿 다운로드 (XLSX)",
    "status": "상태",
    "new": "신규",
    "duplicate": "중복",
    "error": "오류",
    "newCount": "신규 {count}개",
    "dupCount": "중복 {count}개",
    "errCount": "오류 {count}개",
    "duplicateAction": "중복 처리",
    "skip": "건너뛰기",
    "update": "업데이트",
    "emptyValueAction": "빈 값 처리",
    "ignoreEmpty": "기존 값 유지",
    "overwriteEmpty": "빈 값으로 덮어쓰기",
    "execute": "가져오기 실행",
    "importing": "가져오는 중...",
    "cancel": "취소",
    "resultTitle": "가져오기 완료",
    "total": "전체",
    "created": "생성",
    "updated": "업데이트",
    "skipped": "건너뜀",
    "errors": "오류",
    "errorDetails": "오류 상세",
    "importAnother": "다른 파일 가져오기"
  }
}
```

### 6.3 i18n Registration

**File (MODIFY)**: `src/i18n/request.ts`

**Changes**: Add vendors namespace imports and registration.

```typescript
// ADD imports
import enVendors from '@/messages/en/vendors.json';
import koVendors from '@/messages/ko/vendors.json';

// ADD to allMessages
const allMessages: Record<string, Record<string, unknown>> = {
  en: { common: enCommon, shops: enShops, sync: enSync, products: enProducts, inventory: enInventory, auth: enAuth, admin: enAdmin, vendors: enVendors },
  ko: { common: koCommon, shops: koShops, sync: koSync, products: koProducts, inventory: koInventory, auth: koAuth, admin: koAdmin, vendors: koVendors },
};
```

---

## 7. Implementation Order

### Sprint 1 (12 files)
1. `types/index.ts` — Types + Zod schemas
2. `api/vendors/route.ts` — GET (list) + POST (create)
3. `api/vendors/[id]/route.ts` — GET (detail) + PUT + DELETE
4. `hooks/useVendors.ts` — List query
5. `hooks/useVendor.ts` — Single query
6. `hooks/useVendorMutation.ts` — Create/Update/Delete
7. `VendorTable.tsx` — List view
8. `VendorCard.tsx` — Card item
9. `VendorGrid.tsx` — Card grid
10. `VendorFilters.tsx` — Filter dropdowns
11. `vendors/page.tsx` — Main page
12. `DashboardShell.tsx` — Add nav link

### Sprint 2 (6 files)
1. `VendorForm.tsx` — Shared create/edit form
2. `VendorDetail.tsx` — Detail content
3. `VendorProductList.tsx` — Products by vendor
4. `vendors/new/page.tsx` — Create page
5. `vendors/[id]/page.tsx` — Detail page
6. `vendors/[id]/edit/page.tsx` — Edit page

### Sprint 3 (7 files)
1. `hooks/useVendorImport.ts` — Import flow state
2. `api/vendors/import/route.ts` — Parse + execute
3. `api/vendors/import/template/route.ts` — Template download
4. `VendorImportUpload.tsx` — File upload
5. `VendorImportPreview.tsx` — Preview + validation
6. `VendorImportResult.tsx` — Result summary
7. `vendors/import/page.tsx` — Import page

### Sprint 4 (3 files)
1. `messages/en/vendors.json` — EN translations
2. `messages/ko/vendors.json` — KO translations
3. `i18n/request.ts` — Register namespace

---

## 8. Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| xlsx (SheetJS) | Parse XLSX/CSV, generate template | New install |
| react-dropzone | Drag & drop file upload | New install |
| @tanstack/react-query | Data fetching | Already installed |
| zod | Validation | Already installed |
| next-intl | i18n | Already installed |

---

## 9. Verification Checklist

- [ ] `npm run build` passes with 0 errors
- [ ] Vendor list displays with product counts
- [ ] Default sort: missing contact first
- [ ] Search works across name, contactName, code
- [ ] Filters: contact status, active status, auto notify
- [ ] List/card view toggle works
- [ ] Vendor create form saves correctly (ADMIN only)
- [ ] Vendor edit form updates correctly
- [ ] Vendor detail shows associated products
- [ ] Soft-delete sets isActive = false
- [ ] One-click tel: and mailto: links work
- [ ] CSV import with preview and validation
- [ ] XLSX import with preview and validation
- [ ] Import upsert by name (create/update/skip)
- [ ] Import result summary shows correct counts
- [ ] Template download works
- [ ] ADMIN can create/edit/delete/import, USER read-only
- [ ] "Vendors" nav link visible to all authenticated users
- [ ] i18n en/ko complete for vendors namespace
- [ ] Pagination with numbered pills works

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1.0 | 2026-02-09 | Initial design | BDJ Team |
