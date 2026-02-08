# Phase 0-2: Inventory Registration Design Document

> **Status**: Draft
>
> **Project**: BDJ Inventory
> **Version**: 1.0
> **Author**: BDJ Team
> **Created**: 2026-02-07
> **Plan Reference**: [Phase0-2.plan.md](../../01-plan/features/Phase0-2.plan.md)

---

## 1. Implementation Order

```
Sprint 1: DB Schema + API Foundation
Sprint 2: Inventory Registration UI (Desktop + Mobile)
Sprint 3: Inventory Dashboard + Navigation + i18n
```

---

## 2. Sprint 1: DB Schema + API Foundation

### 2.1 File: `prisma/schema.prisma` (Modify)

**Add after existing Product model:**

```prisma
// ---- Phase 0-2 Models ----

enum InventoryStatus {
  AVAILABLE
  RESERVED
  SOLD
  RETURNED
  DAMAGED
}

enum ItemCondition {
  NEW
  LIKE_NEW
  GOOD
  FAIR
  POOR
}

model Location {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  parentId    String?
  parent      Location?  @relation("LocationTree", fields: [parentId], references: [id])
  children    Location[] @relation("LocationTree")
  level       Int        @default(0)
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  inventoryItems InventoryItem[]

  @@index([parentId])
  @@index([level])
}

model InventoryItem {
  id         String          @id @default(cuid())
  barcode    String          @unique
  productId  String
  product    Product         @relation(fields: [productId], references: [id])
  locationId String?
  location   Location?       @relation(fields: [locationId], references: [id])
  status     InventoryStatus @default(AVAILABLE)
  condition  ItemCondition   @default(NEW)
  notes      String?
  receivedAt DateTime        @default(now())
  soldAt     DateTime?
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  @@index([productId])
  @@index([locationId])
  @@index([status])
  @@index([barcode])
}
```

**Modify Product model - add relation:**

```prisma
model Product {
  // ... existing fields ...

  inventoryItems InventoryItem[]

  @@index([shopifySynced])  // new index
  // ... existing indexes ...
}
```

**Changes summary:**
- Add 2 new enums: `InventoryStatus`, `ItemCondition`
- Add 2 new models: `Location` (self-referencing tree), `InventoryItem`
- Modify `Product`: add `inventoryItems` relation + `@@index([shopifySynced])`

### 2.2 File: `prisma/seed.ts` (Create)

```typescript
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Seed locations
  const locations = [
    { name: '1st Floor', code: 'F1', level: 1, description: '1층 매장/창고' },
    { name: 'Basement', code: 'B1', level: 1, description: '지하 창고' },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
  }

  console.log('Seed completed: 2 locations created');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Note:** Uses `upsert` to be idempotent. Must configure `prisma.config.ts` or `package.json` for seed command (`npx tsx prisma/seed.ts`).

### 2.3 New File: `src/features/inventory/types/index.ts`

```typescript
import { z } from 'zod';

// === Enums ===

export const INVENTORY_STATUS = ['AVAILABLE', 'RESERVED', 'SOLD', 'RETURNED', 'DAMAGED'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUS)[number];

export const ITEM_CONDITION = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'] as const;
export type ItemCondition = (typeof ITEM_CONDITION)[number];

// === API Schemas ===

export const scanQuerySchema = z.object({
  barcode: z.string().min(1),
});

export const registerSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().optional(),
  quantity: z.number().int().min(1).max(100),
  condition: z.enum(ITEM_CONDITION).default('NEW'),
  notes: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  shopifyBarcode: z.string().optional(),
  productType: z.string().optional(),
  price: z.number().optional(),
  vendorName: z.string().optional(),
});

export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(INVENTORY_STATUS).optional(),
  locationId: z.string().optional(),
  productId: z.string().optional(),
  sortBy: z.enum(['barcode', 'receivedAt', 'status', 'productName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const locationQuerySchema = z.object({
  parentId: z.string().optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
});

// === Interfaces ===

export interface LocationItem {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  description: string | null;
  isActive: boolean;
  _count?: { inventoryItems: number };
}

export interface InventoryItemDetail {
  id: string;
  barcode: string;
  status: InventoryStatus;
  condition: ItemCondition;
  notes: string | null;
  receivedAt: string;
  soldAt: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    imageUrl: string | null;
    barcodePrefix: string;
    shopifyBarcode: string | null;
  };
  location: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface ScanResult {
  type: 'exact' | 'sku' | 'name';
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    shopifyBarcode: string | null;
    barcodePrefix: string;
    imageUrl: string | null;
    price: string | null;
    vendorName: string | null;
    _count: { inventoryItems: number };
  }>;
}

export interface RegisterResult {
  items: Array<{
    id: string;
    barcode: string;
  }>;
  product: {
    id: string;
    name: string;
    barcodePrefix: string;
  };
}
```

### 2.4 New File: `src/app/api/locations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { locationQuerySchema } from '@/features/inventory/types';

// GET /api/locations - List locations
export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = locationQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { parentId, includeInactive } = parsed.data;

  const where: Record<string, unknown> = {};
  if (parentId) where.parentId = parentId;
  if (includeInactive !== 'true') where.isActive = true;

  const locations = await prisma.location.findMany({
    where,
    orderBy: { code: 'asc' },
    include: {
      _count: { select: { inventoryItems: true } },
    },
  });

  return NextResponse.json({ locations });
}

// POST /api/locations - Create location
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, code, parentId, level, description } = body;

  if (!name || !code) {
    return apiError('VALIDATION_ERROR', 'name and code are required', 400);
  }

  const location = await prisma.location.create({
    data: { name, code, parentId, level: level ?? 0, description },
  });

  return NextResponse.json({ location }, { status: 201 });
}
```

### 2.5 New File: `src/app/api/inventory/scan/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { scanQuerySchema } from '@/features/inventory/types';

// GET /api/inventory/scan?barcode=... - Scan barcode and find products
export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = scanQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'barcode is required', 400);
  }

  const { barcode } = parsed.data;
  const selectFields = {
    id: true,
    name: true,
    sku: true,
    shopifyBarcode: true,
    barcodePrefix: true,
    imageUrl: true,
    price: true,
    vendorName: true,
    _count: { select: { inventoryItems: true } },
  };

  // Priority 1: Exact shopifyBarcode match
  const byBarcode = await prisma.product.findMany({
    where: { shopifyBarcode: barcode, isActive: true },
    select: selectFields,
  });

  if (byBarcode.length > 0) {
    return NextResponse.json({ type: 'exact', products: byBarcode });
  }

  // Priority 2: Exact SKU match
  const bySku = await prisma.product.findMany({
    where: { sku: barcode, isActive: true },
    select: selectFields,
  });

  if (bySku.length > 0) {
    return NextResponse.json({ type: 'sku', products: bySku });
  }

  // Priority 3: Name contains (partial match)
  const byName = await prisma.product.findMany({
    where: { name: { contains: barcode, mode: 'insensitive' }, isActive: true },
    select: selectFields,
    take: 10,
  });

  if (byName.length > 0) {
    return NextResponse.json({ type: 'name', products: byName });
  }

  // No match
  return NextResponse.json({ type: 'exact', products: [] });
}
```

### 2.6 New File: `src/app/api/inventory/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { registerSchema } from '@/features/inventory/types';

// POST /api/inventory/register - Register inventory items
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { productId, locationId, quantity, condition, notes } = parsed.data;

  // Verify product exists
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, name: true, barcodePrefix: true },
  });

  if (!product) {
    return apiError('NOT_FOUND', 'Product not found', 404);
  }

  // Verify location if provided
  if (locationId) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, isActive: true },
    });
    if (!location) {
      return apiError('NOT_FOUND', 'Location not found', 404);
    }
  }

  // Get current max sequence for this product's barcode prefix
  const existingCount = await prisma.inventoryItem.count({
    where: { barcode: { startsWith: product.barcodePrefix + '-' } },
  });

  // Create items with sequential barcodes
  const items: Array<{ id: string; barcode: string }> = [];

  for (let i = 0; i < quantity; i++) {
    const seq = existingCount + i + 1;
    const barcode = `${product.barcodePrefix}-${String(seq).padStart(3, '0')}`;

    const item = await prisma.inventoryItem.create({
      data: {
        barcode,
        productId,
        locationId: locationId ?? null,
        condition,
        notes,
        status: 'AVAILABLE',
      },
      select: { id: true, barcode: true },
    });

    items.push(item);
  }

  return NextResponse.json({
    items,
    product: {
      id: product.id,
      name: product.name,
      barcodePrefix: product.barcodePrefix,
    },
  }, { status: 201 });
}
```

### 2.7 New File: `src/app/api/inventory/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { inventoryQuerySchema } from '@/features/inventory/types';
import type { Prisma } from '@/generated/prisma/client';

// GET /api/inventory - List inventory items with pagination
export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = inventoryQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, status, locationId, productId, sortBy, sortOrder, page, limit } = parsed.data;

  const where: Prisma.InventoryItemWhereInput = {};

  if (search) {
    where.OR = [
      { barcode: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { sku: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status) where.status = status;
  if (locationId) where.locationId = locationId;
  if (productId) where.productId = productId;

  const orderBy: Prisma.InventoryItemOrderByWithRelationInput =
    sortBy === 'barcode' ? { barcode: sortOrder ?? 'asc' }
    : sortBy === 'status' ? { status: sortOrder ?? 'asc' }
    : sortBy === 'productName' ? { product: { name: sortOrder ?? 'asc' } }
    : { receivedAt: sortOrder ?? 'desc' };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            barcodePrefix: true,
            shopifyBarcode: true,
          },
        },
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  // Aggregate stats
  const stats = await prisma.inventoryItem.groupBy({
    by: ['status'],
    _count: true,
  });

  const locationStats = await prisma.inventoryItem.groupBy({
    by: ['locationId'],
    _count: true,
    where: { locationId: { not: null } },
  });

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      byStatus: stats.map((s) => ({ status: s.status, count: s._count })),
      byLocation: locationStats,
      total,
    },
  });
}
```

### 2.8 New File: `src/app/api/inventory/products/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { createProductSchema } from '@/features/inventory/types';

// POST /api/inventory/products - Create new product (unsynced)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { name, sku, shopifyBarcode, productType, price, vendorName } = parsed.data;

  // Generate barcodePrefix: BDJ-{random 6 chars}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let barcodePrefix: string;
  let attempts = 0;

  do {
    const random = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    barcodePrefix = `BDJ-${random}`;
    const existing = await prisma.product.findUnique({
      where: { barcodePrefix },
      select: { id: true },
    });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return apiError('CONFLICT', 'Could not generate unique barcode prefix', 500);
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku,
      shopifyBarcode,
      productType,
      price: price ?? null,
      vendorName,
      barcodePrefix,
      shopifySynced: false,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcodePrefix: true,
      shopifySynced: true,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
```

### 2.9 Sprint 1 Verification

- [ ] `npx prisma migrate dev` succeeds (Location + InventoryItem + enums)
- [ ] `npx tsx prisma/seed.ts` creates F1, B1 locations
- [ ] `GET /api/locations` returns seeded locations
- [ ] `POST /api/locations` creates new location
- [ ] `GET /api/inventory/scan?barcode=...` returns matched products with priority search
- [ ] `POST /api/inventory/register` creates N items with sequential barcodes
- [ ] `GET /api/inventory` returns paginated items with stats
- [ ] `POST /api/inventory/products` creates unsynced product with generated barcodePrefix
- [ ] `npm run build` passes

---

## 3. Sprint 2: Inventory Registration UI

### 3.1 New File: `src/features/inventory/hooks/useLocations.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import type { LocationItem } from '../types';

async function fetchLocations(): Promise<{ locations: LocationItem[] }> {
  const res = await fetch('/api/locations');
  if (!res.ok) throw new Error('Failed to fetch locations');
  return res.json();
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });
}
```

### 3.2 New File: `src/features/inventory/hooks/useScanProduct.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import type { ScanResult } from '../types';

async function scanProduct(barcode: string): Promise<ScanResult> {
  const res = await fetch(`/api/inventory/scan?barcode=${encodeURIComponent(barcode)}`);
  if (!res.ok) throw new Error('Failed to scan');
  return res.json();
}

export function useScanProduct(barcode: string | null) {
  return useQuery({
    queryKey: ['scan', barcode],
    queryFn: () => scanProduct(barcode!),
    enabled: !!barcode && barcode.length > 0,
  });
}
```

### 3.3 New File: `src/features/inventory/hooks/useRegisterInventory.ts`

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RegisterResult } from '../types';

interface RegisterParams {
  productId: string;
  locationId?: string;
  quantity: number;
  condition: string;
  notes?: string;
}

async function registerInventory(params: RegisterParams): Promise<RegisterResult> {
  const res = await fetch('/api/inventory/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Failed to register');
  }
  return res.json();
}

export function useRegisterInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['scan'] });
    },
  });
}
```

### 3.4 New File: `src/features/inventory/components/BarcodeScanner.tsx`

```tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  autoFocus?: boolean;
}

export function BarcodeScanner({ onScan, autoFocus = true }: BarcodeScannerProps) {
  const t = useTranslations('inventory');
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [isCameraMode, setIsCameraMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-focus input for USB/Bluetooth scanner
  useEffect(() => {
    if (autoFocus && inputRef.current && !isCameraMode) {
      inputRef.current.focus();
    }
  }, [autoFocus, isCameraMode]);

  // Handle USB scanner input (ends with Enter key)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
      setValue('');
    }
  }, [value, onScan]);

  // Camera barcode scanning
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraMode(true);

      // Try BarcodeDetector API first
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });

        const detectLoop = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              onScan(barcodes[0].rawValue);
              stopCamera();
              return;
            }
          } catch {
            // ignore detection errors
          }
          if (streamRef.current) {
            requestAnimationFrame(detectLoop);
          }
        };

        videoRef.current?.addEventListener('loadedmetadata', () => {
          detectLoop();
        });
      }
    } catch {
      // Camera permission denied - fall back to manual input
      setIsCameraMode(false);
    }
  }, [onScan]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraMode(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Manual / Scanner input */}
      {!isCameraMode && (
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('scan.placeholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-lg placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-400"
          />
        </div>
      )}

      {/* Camera view */}
      {isCameraMode && (
        <div className="relative overflow-hidden rounded-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video rounded-xl bg-black"
          />
          <button
            onClick={stopCamera}
            className="absolute bottom-3 right-3 rounded-full bg-black/70 px-4 py-2 text-sm text-white"
          >
            {t('scan.stopCamera')}
          </button>
        </div>
      )}

      {/* Camera toggle button */}
      <button
        onClick={isCameraMode ? stopCamera : startCamera}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {isCameraMode ? t('scan.stopCamera') : t('scan.useCamera')}
      </button>
    </div>
  );
}
```

**Notes:**
- USB/Bluetooth scanners emulate keyboard: value auto-populates, Enter triggers scan
- Camera mode: `BarcodeDetector` API (Chrome 83+), no fallback library initially (html5-qrcode can be added later)
- Manual text input always available
- Mobile: `facingMode: 'environment'` for rear camera

### 3.5 New File: `src/features/inventory/components/ProductMatchCard.tsx`

```tsx
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ProductMatchCardProps {
  product: {
    id: string;
    name: string;
    sku: string | null;
    shopifyBarcode: string | null;
    barcodePrefix: string;
    imageUrl: string | null;
    price: string | null;
    vendorName: string | null;
    _count: { inventoryItems: number };
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function ProductMatchCard({ product, isSelected, onSelect }: ProductMatchCardProps) {
  const t = useTranslations('inventory');

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-black bg-gray-50 ring-2 ring-black dark:border-white dark:bg-zinc-800 dark:ring-white'
          : 'border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600'
      }`}
    >
      <div className="flex gap-3">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-zinc-800">
            N/A
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          {product.sku && (
            <p className="text-sm text-gray-500 dark:text-zinc-400">SKU: {product.sku}</p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            {product.price && <span>{product.price}</span>}
            <span>{t('register.currentStock', { count: product._count.inventoryItems })}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
```

### 3.6 New File: `src/features/inventory/components/RegisterForm.tsx`

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocations } from '../hooks/useLocations';
import { ITEM_CONDITION } from '../types';

interface RegisterFormProps {
  productName: string;
  onSubmit: (data: {
    quantity: number;
    locationId?: string;
    condition: string;
    notes?: string;
  }) => void;
  isSubmitting: boolean;
}

export function RegisterForm({ productName, onSubmit, isSubmitting }: RegisterFormProps) {
  const t = useTranslations('inventory');
  const { data: locData } = useLocations();
  const [quantity, setQuantity] = useState(1);
  const [locationId, setLocationId] = useState('');
  const [condition, setCondition] = useState<string>('NEW');
  const [notes, setNotes] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      quantity,
      locationId: locationId || undefined,
      condition,
      notes: notes || undefined,
    });
  }, [quantity, locationId, condition, notes, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        {t('register.registeringFor', { product: productName })}
      </p>

      {/* Quantity */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.quantity')}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-lg dark:border-zinc-700"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center text-lg dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => setQuantity(Math.min(100, quantity + 1))}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-lg dark:border-zinc-700"
          >
            +
          </button>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.location')}
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t('register.noLocation')}</option>
          {locData?.locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.code})
            </option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.condition')}
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {ITEM_CONDITION.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                condition === c
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'border border-gray-200 text-gray-500 dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              {t(`condition.${c}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder={t('register.notesPlaceholder')}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {isSubmitting
          ? t('register.registering')
          : t('register.submit', { count: quantity })
        }
      </button>
    </form>
  );
}
```

### 3.7 New File: `src/features/inventory/components/RecentRegistrations.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { RegisterResult } from '../types';

interface RecentRegistrationsProps {
  registrations: RegisterResult[];
  onPrintLabels: (items: Array<{ barcode: string }>, productName: string) => void;
}

export function RecentRegistrations({ registrations, onPrintLabels }: RecentRegistrationsProps) {
  const t = useTranslations('inventory');

  if (registrations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium">
        {t('register.recentTitle')}
      </h3>
      {registrations.map((reg, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-gray-200 p-4 dark:border-zinc-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{reg.product.name}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {t('register.itemsCreated', { count: reg.items.length })}
              </p>
            </div>
            <button
              onClick={() => onPrintLabels(reg.items, reg.product.name)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-zinc-700 dark:text-zinc-400"
            >
              {t('register.printLabels')}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reg.items.map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono dark:bg-zinc-800"
              >
                {item.barcode}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3.8 New File: `src/features/inventory/components/LabelPrintView.tsx`

```tsx
'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';

interface LabelPrintViewProps {
  items: Array<{ barcode: string }>;
  productName: string;
  onClose: () => void;
}

export function LabelPrintView({ items, productName, onClose }: LabelPrintViewProps) {
  const t = useTranslations('inventory');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('labels.title')}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {t('labels.print')}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Print area */}
        <div ref={printRef} className="print-labels">
          {items.map((item) => (
            <div
              key={item.barcode}
              className="label-item mb-4 rounded-lg border border-gray-200 p-3 text-center dark:border-zinc-700"
            >
              <p className="text-xs text-gray-400 mb-1">{productName}</p>
              <p className="text-lg font-mono font-bold">{item.barcode}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(.print-labels) { display: none !important; }
          .print-labels { display: block !important; }
          .label-item {
            page-break-inside: avoid;
            border: 1px solid #000;
            padding: 8mm 4mm;
            margin-bottom: 2mm;
            width: 50mm;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
```

### 3.9 New File: `src/features/inventory/components/NewProductForm.tsx`

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface NewProductFormProps {
  initialBarcode?: string;
  onSubmit: (data: {
    name: string;
    sku?: string;
    shopifyBarcode?: string;
    productType?: string;
    price?: number;
    vendorName?: string;
  }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function NewProductForm({ initialBarcode, onSubmit, isSubmitting, onCancel }: NewProductFormProps) {
  const t = useTranslations('inventory');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [shopifyBarcode, setShopifyBarcode] = useState(initialBarcode ?? '');
  const [productType, setProductType] = useState('');
  const [price, setPrice] = useState('');
  const [vendorName, setVendorName] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      sku: sku || undefined,
      shopifyBarcode: shopifyBarcode || undefined,
      productType: productType || undefined,
      price: price ? Number(price) : undefined,
      vendorName: vendorName || undefined,
    });
  }, [name, sku, shopifyBarcode, productType, price, vendorName, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium">{t('newProduct.title')}</h3>

      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('newProduct.name')} *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.sku')}
          </label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.barcode')}
          </label>
          <input
            type="text"
            value={shopifyBarcode}
            onChange={(e) => setShopifyBarcode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.productType')}
          </label>
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {t('newProduct.price')}
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('newProduct.vendorName')}
        </label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name || isSubmitting}
          className="flex-1 rounded-full bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isSubmitting ? t('newProduct.creating') : t('newProduct.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-200 px-4 py-2.5 text-sm dark:border-zinc-700"
        >
          {t('newProduct.cancel')}
        </button>
      </div>
    </form>
  );
}
```

### 3.10 New File: `src/app/(dashboard)/inventory/register/page.tsx`

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { BarcodeScanner } from '@/features/inventory/components/BarcodeScanner';
import { ProductMatchCard } from '@/features/inventory/components/ProductMatchCard';
import { RegisterForm } from '@/features/inventory/components/RegisterForm';
import { RecentRegistrations } from '@/features/inventory/components/RecentRegistrations';
import { LabelPrintView } from '@/features/inventory/components/LabelPrintView';
import { NewProductForm } from '@/features/inventory/components/NewProductForm';
import { useScanProduct } from '@/features/inventory/hooks/useScanProduct';
import { useRegisterInventory } from '@/features/inventory/hooks/useRegisterInventory';
import type { RegisterResult } from '@/features/inventory/types';

export default function InventoryRegisterPage() {
  const t = useTranslations('inventory');

  // State
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<RegisterResult[]>([]);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [printData, setPrintData] = useState<{ items: Array<{ barcode: string }>; productName: string } | null>(null);

  // Hooks
  const { data: scanResult, isLoading: isScanning } = useScanProduct(scannedBarcode);
  const registerMutation = useRegisterInventory();

  // Handlers
  const handleScan = useCallback((barcode: string) => {
    setScannedBarcode(barcode);
    setSelectedProductId(null);
    setShowNewProductForm(false);
  }, []);

  const handleRegister = useCallback((data: {
    quantity: number;
    locationId?: string;
    condition: string;
    notes?: string;
  }) => {
    if (!selectedProductId) return;

    registerMutation.mutate(
      { productId: selectedProductId, ...data },
      {
        onSuccess: (result) => {
          setRecentRegistrations((prev) => [result, ...prev].slice(0, 5));
          setScannedBarcode(null);
          setSelectedProductId(null);
        },
      }
    );
  }, [selectedProductId, registerMutation]);

  const handleCreateProduct = useCallback(async (data: {
    name: string;
    sku?: string;
    shopifyBarcode?: string;
    productType?: string;
    price?: number;
    vendorName?: string;
  }) => {
    const res = await fetch('/api/inventory/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { product } = await res.json();
      setSelectedProductId(product.id);
      setShowNewProductForm(false);
      // Re-scan to refresh results
      setScannedBarcode(null);
    }
  }, []);

  const handlePrintLabels = useCallback((items: Array<{ barcode: string }>, productName: string) => {
    setPrintData({ items, productName });
  }, []);

  const selectedProduct = scanResult?.products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('register.title')}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Scan + Match */}
        <div className="space-y-6">
          {/* Scanner */}
          <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
              {t('scan.title')}
            </h2>
            <BarcodeScanner onScan={handleScan} />
          </div>

          {/* Scan Results */}
          {scannedBarcode && (
            <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
              <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
                {t('scan.results')}
                {scanResult && (
                  <span className="ml-2 text-gray-300">
                    ({scanResult.products.length} {t('scan.found')})
                  </span>
                )}
              </h2>

              {isScanning ? (
                <p className="text-gray-400 py-4 text-center">{t('scan.searching')}</p>
              ) : scanResult && scanResult.products.length > 0 ? (
                <div className="space-y-2">
                  {scanResult.products.map((product) => (
                    <ProductMatchCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProductId === product.id}
                      onSelect={() => setSelectedProductId(product.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-gray-400">{t('scan.noMatch')}</p>
                  <button
                    onClick={() => setShowNewProductForm(true)}
                    className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                  >
                    {t('scan.createNew')}
                  </button>
                </div>
              )}

              {showNewProductForm && (
                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-zinc-800">
                  <NewProductForm
                    initialBarcode={scannedBarcode}
                    onSubmit={handleCreateProduct}
                    isSubmitting={false}
                    onCancel={() => setShowNewProductForm(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Register Form + Recent */}
        <div className="space-y-6">
          {/* Register Form */}
          {selectedProduct && (
            <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
              <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-4">
                {t('register.formTitle')}
              </h2>
              <RegisterForm
                productName={selectedProduct.name}
                onSubmit={handleRegister}
                isSubmitting={registerMutation.isPending}
              />
            </div>
          )}

          {/* Recent Registrations */}
          <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-700">
            <RecentRegistrations
              registrations={recentRegistrations}
              onPrintLabels={handlePrintLabels}
            />
          </div>
        </div>
      </div>

      {/* Label Print Modal */}
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
```

### 3.11 Sprint 2 Verification

- [ ] `npm run build` passes
- [ ] `/inventory/register` page loads
- [ ] USB/Bluetooth scanner input triggers search on Enter
- [ ] Manual text input works
- [ ] Camera button opens video feed (mobile)
- [ ] Scan results show matched products with images
- [ ] Selecting a product shows register form
- [ ] Quantity +/- buttons work (1-100 range)
- [ ] Location dropdown populated with seeded locations
- [ ] Condition chips toggle correctly
- [ ] Submit creates items, shows in recent registrations
- [ ] Print labels button opens print view
- [ ] `window.print()` produces label layout
- [ ] No match → "Create New" button → new product form
- [ ] New product created with `shopifySynced: false`

---

## 4. Sprint 3: Inventory Dashboard + Navigation + i18n

### 4.1 New File: `src/features/inventory/hooks/useInventory.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

interface UseInventoryParams {
  search?: string;
  status?: string;
  locationId?: string;
  productId?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

async function fetchInventory(params: UseInventoryParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.locationId) searchParams.set('locationId', params.locationId);
  if (params.productId) searchParams.set('productId', params.productId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`/api/inventory?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export function useInventory(params: UseInventoryParams = {}) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => fetchInventory(params),
  });
}
```

### 4.2 New File: `src/features/inventory/components/InventoryStats.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';

interface InventoryStatsProps {
  stats: {
    byStatus: Array<{ status: string; count: number }>;
    total: number;
  };
}

export function InventoryStats({ stats }: InventoryStatsProps) {
  const t = useTranslations('inventory');

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    RESERVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    SOLD: 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-400',
    RETURNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DAMAGED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {stats.byStatus.map((s) => (
        <div
          key={s.status}
          className={`rounded-xl p-4 ${statusColors[s.status] ?? 'bg-gray-100'}`}
        >
          <p className="text-2xl font-bold">{s.count}</p>
          <p className="text-xs">{t(`status.${s.status}`)}</p>
        </div>
      ))}
    </div>
  );
}
```

### 4.3 New File: `src/features/inventory/components/InventoryTable.tsx`

```tsx
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { InventoryItemDetail } from '../types';

interface InventoryTableProps {
  items: InventoryItemDetail[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const t = useTranslations('inventory');

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
      RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ''}`}>
        {t(`status.${status}`)}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.product')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.barcode')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.location')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.status')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.condition')}
            </th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {t('table.receivedAt')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {item.product.imageUrl ? (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
                  )}
                  <div>
                    <p className="font-medium truncate max-w-[200px]">{item.product.name}</p>
                    {item.product.sku && (
                      <p className="text-xs text-gray-400">{item.product.sku}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="font-mono text-xs">{item.barcode}</span>
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {item.location ? `${item.location.name} (${item.location.code})` : '—'}
              </td>
              <td className="px-5 py-4">
                {statusBadge(item.status)}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {t(`condition.${item.condition}`)}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                {new Date(item.receivedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 4.4 New File: `src/app/(dashboard)/inventory/page.tsx`

```tsx
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
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder={t('search.placeholder')}
          className="w-72 rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900"
        />

        {/* Status filter */}
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

        {/* Location filter */}
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

          {/* Pagination */}
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
```

### 4.5 File: `src/app/(dashboard)/layout.tsx` (Modify)

**Add inventory nav link:**

```tsx
<nav className="flex items-center gap-6 text-sm">
  <Link href="/shops" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
    {t('nav.shops')}
  </Link>
  <Link href="/products" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
    {t('nav.products')}
  </Link>
  <Link href="/inventory" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
    {t('nav.inventory')}
  </Link>
</nav>
```

**Changes:** Add one `<Link>` for `/inventory` using `t('nav.inventory')` (key already exists in common.json).

### 4.6 New File: `src/messages/en/inventory.json`

```json
{
  "title": "Inventory",
  "totalCount": "{count} items",
  "registerButton": "Register Items",
  "loading": "Loading...",
  "noItems": "No inventory items yet",
  "scan": {
    "title": "Scan Barcode",
    "placeholder": "Scan barcode or type to search...",
    "useCamera": "Use Camera",
    "stopCamera": "Stop Camera",
    "results": "Results",
    "found": "found",
    "searching": "Searching...",
    "noMatch": "No matching product found",
    "createNew": "Create New Product"
  },
  "register": {
    "title": "Register Inventory",
    "formTitle": "Register Items",
    "registeringFor": "Adding inventory for: {product}",
    "quantity": "Quantity",
    "location": "Location",
    "noLocation": "No location",
    "condition": "Condition",
    "notes": "Notes",
    "notesPlaceholder": "Optional notes...",
    "submit": "Register {count} items",
    "registering": "Registering...",
    "recentTitle": "Recent Registrations",
    "itemsCreated": "{count} items created",
    "printLabels": "Print Labels",
    "currentStock": "{count} in stock"
  },
  "newProduct": {
    "title": "Create New Product",
    "name": "Product Name",
    "sku": "SKU",
    "barcode": "Barcode",
    "productType": "Type",
    "price": "Price",
    "vendorName": "Vendor",
    "create": "Create Product",
    "creating": "Creating...",
    "cancel": "Cancel"
  },
  "labels": {
    "title": "Print Labels",
    "print": "Print"
  },
  "status": {
    "AVAILABLE": "Available",
    "RESERVED": "Reserved",
    "SOLD": "Sold",
    "RETURNED": "Returned",
    "DAMAGED": "Damaged"
  },
  "condition": {
    "NEW": "New",
    "LIKE_NEW": "Like New",
    "GOOD": "Good",
    "FAIR": "Fair",
    "POOR": "Poor"
  },
  "table": {
    "product": "Product",
    "barcode": "Barcode",
    "location": "Location",
    "status": "Status",
    "condition": "Condition",
    "receivedAt": "Received"
  },
  "filter": {
    "allStatuses": "All Statuses",
    "allLocations": "All Locations"
  },
  "search": {
    "placeholder": "Search by barcode, product name, SKU..."
  },
  "pagination": {
    "previous": "Previous",
    "next": "Next",
    "page": "Page {current} of {total}"
  }
}
```

### 4.7 New File: `src/messages/ko/inventory.json`

```json
{
  "title": "재고",
  "totalCount": "{count}개",
  "registerButton": "재고 등록",
  "loading": "로딩 중...",
  "noItems": "등록된 재고가 없습니다",
  "scan": {
    "title": "바코드 스캔",
    "placeholder": "바코드를 스캔하거나 검색어를 입력하세요...",
    "useCamera": "카메라 사용",
    "stopCamera": "카메라 중지",
    "results": "검색 결과",
    "found": "건",
    "searching": "검색 중...",
    "noMatch": "일치하는 상품이 없습니다",
    "createNew": "신규 상품 생성"
  },
  "register": {
    "title": "재고 등록",
    "formTitle": "아이템 등록",
    "registeringFor": "등록 대상: {product}",
    "quantity": "수량",
    "location": "위치",
    "noLocation": "위치 없음",
    "condition": "컨디션",
    "notes": "메모",
    "notesPlaceholder": "선택 사항...",
    "submit": "{count}개 등록",
    "registering": "등록 중...",
    "recentTitle": "최근 등록",
    "itemsCreated": "{count}개 생성됨",
    "printLabels": "라벨 인쇄",
    "currentStock": "재고 {count}개"
  },
  "newProduct": {
    "title": "신규 상품 생성",
    "name": "상품명",
    "sku": "SKU",
    "barcode": "바코드",
    "productType": "유형",
    "price": "가격",
    "vendorName": "벤더",
    "create": "상품 생성",
    "creating": "생성 중...",
    "cancel": "취소"
  },
  "labels": {
    "title": "라벨 인쇄",
    "print": "인쇄"
  },
  "status": {
    "AVAILABLE": "이용 가능",
    "RESERVED": "예약됨",
    "SOLD": "판매됨",
    "RETURNED": "반품",
    "DAMAGED": "손상"
  },
  "condition": {
    "NEW": "새 상품",
    "LIKE_NEW": "거의 새것",
    "GOOD": "좋음",
    "FAIR": "보통",
    "POOR": "나쁨"
  },
  "table": {
    "product": "상품",
    "barcode": "바코드",
    "location": "위치",
    "status": "상태",
    "condition": "컨디션",
    "receivedAt": "입고일"
  },
  "filter": {
    "allStatuses": "전체 상태",
    "allLocations": "전체 위치"
  },
  "search": {
    "placeholder": "바코드, 상품명, SKU로 검색..."
  },
  "pagination": {
    "previous": "이전",
    "next": "다음",
    "page": "{total}페이지 중 {current}"
  }
}
```

### 4.8 Sprint 3 Verification

- [ ] `npm run build` passes
- [ ] `/inventory` page shows dashboard with stats cards
- [ ] Status cards show correct counts per status
- [ ] Inventory table shows items with product info, barcode, location, status, condition
- [ ] Search filters by barcode/product name/SKU
- [ ] Status dropdown filters by inventory status
- [ ] Location dropdown filters by location
- [ ] Pagination works correctly
- [ ] "Register Items" button links to `/inventory/register`
- [ ] Empty state shows register CTA
- [ ] Navigation has "Inventory" link (both en/ko)
- [ ] All i18n keys work in en and ko

---

## 5. Complete File Change Matrix

| # | File | Sprint 1 | Sprint 2 | Sprint 3 |
|---|------|:--------:|:--------:|:--------:|
| 1 | `prisma/schema.prisma` | Modify | | |
| 2 | `prisma/seed.ts` | **Create** | | |
| 3 | `src/features/inventory/types/index.ts` | **Create** | | |
| 4 | `src/app/api/locations/route.ts` | **Create** | | |
| 5 | `src/app/api/inventory/scan/route.ts` | **Create** | | |
| 6 | `src/app/api/inventory/register/route.ts` | **Create** | | |
| 7 | `src/app/api/inventory/route.ts` | **Create** | | |
| 8 | `src/app/api/inventory/products/route.ts` | **Create** | | |
| 9 | `src/features/inventory/hooks/useLocations.ts` | | **Create** | |
| 10 | `src/features/inventory/hooks/useScanProduct.ts` | | **Create** | |
| 11 | `src/features/inventory/hooks/useRegisterInventory.ts` | | **Create** | |
| 12 | `src/features/inventory/components/BarcodeScanner.tsx` | | **Create** | |
| 13 | `src/features/inventory/components/ProductMatchCard.tsx` | | **Create** | |
| 14 | `src/features/inventory/components/RegisterForm.tsx` | | **Create** | |
| 15 | `src/features/inventory/components/RecentRegistrations.tsx` | | **Create** | |
| 16 | `src/features/inventory/components/LabelPrintView.tsx` | | **Create** | |
| 17 | `src/features/inventory/components/NewProductForm.tsx` | | **Create** | |
| 18 | `src/app/(dashboard)/inventory/register/page.tsx` | | **Create** | |
| 19 | `src/features/inventory/hooks/useInventory.ts` | | | **Create** |
| 20 | `src/features/inventory/components/InventoryStats.tsx` | | | **Create** |
| 21 | `src/features/inventory/components/InventoryTable.tsx` | | | **Create** |
| 22 | `src/app/(dashboard)/inventory/page.tsx` | | | **Create** |
| 23 | `src/app/(dashboard)/layout.tsx` | | | Modify |
| 24 | `src/messages/en/inventory.json` | | | **Create** |
| 25 | `src/messages/ko/inventory.json` | | | **Create** |

**Total: 23 new files, 2 modified files = 25 file changes**

---

## 6. Design Tokens Reference (bkit.ai)

All new components must follow these tokens:

| Token | Value |
|-------|-------|
| Active chip/button | `bg-black text-white rounded-full` (dark: `bg-white text-black`) |
| Inactive chip/button | `border border-gray-200 text-gray-500 rounded-full` |
| Section header | `text-xs uppercase tracking-wider text-gray-400 font-medium` |
| Card/container | `rounded-xl border border-gray-200 p-6 dark:border-zinc-700` |
| Input | `rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900` |
| Primary button | `rounded-full bg-black py-2.5 text-white dark:bg-white dark:text-black` |
| Focus ring | Global CSS (black/zinc-400) |
| Status badge | `rounded-full px-2 py-0.5 text-xs font-medium` + color per status |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-07 | Initial design | BDJ Team |
