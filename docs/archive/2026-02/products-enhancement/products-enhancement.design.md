# Products Enhancement Design Document

> **Status**: Draft
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Created**: 2026-02-07
> **Plan Reference**: [products-enhancement.plan.md](../../01-plan/features/products-enhancement.plan.md)

---

## 1. Implementation Order

```
Sprint 1: Dark Mode Toggle (Feature 3)
Sprint 2: Quick Filter Chips (Feature 1)
Sprint 3: Product Detail View (Feature 2)
```

---

## 2. Sprint 1: Dark Mode Toggle

### 2.1 File: `src/app/globals.css`

**Current**: Uses `@media (prefers-color-scheme: dark)` for dark mode.
**Target**: Class-based dark mode via Tailwind v4 `@custom-variant`.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #ffffff;
  --foreground: #171717;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: 'Inter', var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', Arial, Helvetica, sans-serif;
}

/* Override default focus ring to black (bkit.ai style) */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px #18181b;
}

.dark *:focus-visible {
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px #a1a1aa;
}
```

**Changes summary:**
- Remove both `@media (prefers-color-scheme: dark)` blocks
- Add `@custom-variant dark (&:where(.dark, .dark *));` after tailwindcss import
- Replace dark media query CSS vars with `.dark { }` selector
- Replace dark focus ring media query with `.dark *:focus-visible { }` selector

### 2.2 File: `src/app/layout.tsx`

**Changes:**
1. Import `cookies` from `next/headers`
2. Read `NEXT_THEME` cookie (default: `'dark'`)
3. Add `className={theme === 'dark' ? 'dark' : ''}` to `<html>` tag
4. Add inline `<script>` inside `<head>` to prevent FOUC

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import { QueryProvider } from '@/lib/query-provider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BDJ Inventory",
  description: "Shopify multi-store inventory management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const theme = cookieStore.get('NEXT_THEME')?.value ?? 'dark';

  return (
    <html lang={locale} className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var m = document.cookie.match(/NEXT_THEME=(\\w+)/);
            var t = m ? m[1] : 'dark';
            if (t === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          })()
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 2.3 New File: `src/components/ThemeToggle.tsx`

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const THEME_COOKIE = 'NEXT_THEME';

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function ThemeToggle() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setIsDark(!isDark);
    setCookie(THEME_COOKIE, next);
    router.refresh();
  }, [isDark, router]);

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        {/* Sun icon - shown in dark mode (click to go light) */}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        {/* Moon icon - shown in light mode (click to go dark) */}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
```

**Note:** SVG icons are inline Lucide-style icons. No external library.

### 2.4 File: `src/app/(dashboard)/layout.tsx`

**Changes:** Import and add `ThemeToggle` next to `LanguageSwitcher`.

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              BDJ Inventory
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/shops" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.shops')}
              </Link>
              <Link href="/products" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.products')}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>
    </div>
  );
}
```

**Change:** Wrap `<ThemeToggle />` and `<LanguageSwitcher />` in `<div className="flex items-center gap-2">`.

### 2.5 i18n: `src/messages/en/common.json` (add)

```json
{
  "theme": {
    "light": "Light mode",
    "dark": "Dark mode",
    "toggle": "Toggle theme"
  }
}
```

### 2.6 i18n: `src/messages/ko/common.json` (add)

```json
{
  "theme": {
    "light": "라이트 모드",
    "dark": "다크 모드",
    "toggle": "테마 전환"
  }
}
```

### 2.7 Sprint 1 Verification

- [ ] `npm run build` passes
- [ ] Default theme is dark (page loads dark)
- [ ] Toggle button in header right side, next to language switcher
- [ ] Click toggles dark ↔ light
- [ ] Theme persists on page refresh (cookie)
- [ ] No FOUC (flash of wrong theme on load)
- [ ] All existing `dark:` Tailwind classes still work

---

## 3. Sprint 2: Quick Filter Chips

### 3.1 File: `src/features/products/types/index.ts`

**Add to `productQuerySchema`:**

```typescript
export const productQuerySchema = z.object({
  search: z.string().optional(),
  storeIds: z.string().optional(),
  vendorIds: z.string().optional(),
  productTypes: z.string().optional(),
  missingSku: z.enum(['true', 'false']).optional(),
  missingBarcode: z.enum(['true', 'false']).optional(),
  missingPrice: z.enum(['true', 'false']).optional(),
  missingImage: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'price', 'updatedAt', 'vendorName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});
```

**New fields:** `missingSku`, `missingBarcode`, `missingPrice`, `missingImage` — each `z.enum(['true', 'false']).optional()`.

### 3.2 File: `src/app/api/products/route.ts`

**Add after existing filter logic (after line ~38):**

```typescript
const { search, storeIds, vendorIds, productTypes, missingSku, missingBarcode, missingPrice, missingImage, sortBy, sortOrder, page, limit } = parsed.data;

// ... existing search/store/vendor/type filters ...

// Quick filters (null/non-null checks)
if (missingSku === 'true') where.sku = null;
else if (missingSku === 'false') where.sku = { not: null };

if (missingBarcode === 'true') where.shopifyBarcode = null;
else if (missingBarcode === 'false') where.shopifyBarcode = { not: null };

if (missingPrice === 'true') where.price = null;
else if (missingPrice === 'false') where.price = { not: null };

if (missingImage === 'true') where.imageUrl = null;
else if (missingImage === 'false') where.imageUrl = { not: null };
```

### 3.3 File: `src/features/products/hooks/useProducts.ts`

**Add to `UseProductsParams` interface:**

```typescript
interface UseProductsParams {
  search?: string;
  storeIds?: string[];
  vendorIds?: string[];
  productTypes?: string[];
  missingSku?: string;
  missingBarcode?: string;
  missingPrice?: string;
  missingImage?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}
```

**Add to `fetchProducts` searchParams building:**

```typescript
if (params.missingSku) searchParams.set('missingSku', params.missingSku);
if (params.missingBarcode) searchParams.set('missingBarcode', params.missingBarcode);
if (params.missingPrice) searchParams.set('missingPrice', params.missingPrice);
if (params.missingImage) searchParams.set('missingImage', params.missingImage);
```

### 3.4 New File: `src/features/products/components/QuickFilters.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';

// Each filter has a key matching the API param and a translationKey for i18n
const QUICK_FILTERS = [
  { key: 'missingSku', translationKey: 'missingSku', value: 'true' },
  { key: 'missingSku', translationKey: 'hasSku', value: 'false' },
  { key: 'missingBarcode', translationKey: 'missingBarcode', value: 'true' },
  { key: 'missingBarcode', translationKey: 'hasBarcode', value: 'false' },
  { key: 'missingPrice', translationKey: 'missingPrice', value: 'true' },
  { key: 'missingImage', translationKey: 'missingImage', value: 'true' },
] as const;

interface QuickFiltersProps {
  activeFilters: Record<string, string>;
  onToggle: (key: string, value: string) => void;
}

export function QuickFilters({ activeFilters, onToggle }: QuickFiltersProps) {
  const t = useTranslations('products');

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((filter) => {
        const isActive = activeFilters[filter.key] === filter.value;
        return (
          <button
            key={filter.translationKey}
            onClick={() => onToggle(filter.key, filter.value)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              isActive
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            {t(`quickFilter.${filter.translationKey}`)}
          </button>
        );
      })}
    </div>
  );
}
```

**Props type:** `activeFilters` is `Record<string, string>` (key → value, e.g., `{ missingSku: 'true' }`).
**Toggle logic:** If the filter is already active with that value, clear it. If not active or different value, set it.

### 3.5 File: `src/app/(dashboard)/products/page.tsx`

**Add state:**

```typescript
const [quickFilters, setQuickFilters] = useState<Record<string, string>>({});
```

**Toggle handler:**

```typescript
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
```

**Pass to useProducts:**

```typescript
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
```

**JSX placement** (between toolbar and content):

```tsx
<div className="flex flex-wrap items-center gap-3">
  {/* existing search, filters, sort */}
</div>

<QuickFilters activeFilters={quickFilters} onToggle={handleQuickFilterToggle} />

{isLoading ? (
  ...
```

### 3.6 i18n: `src/messages/en/products.json` (add)

```json
{
  "quickFilter": {
    "missingSku": "Missing SKU",
    "hasSku": "Has SKU",
    "missingBarcode": "Missing Barcode",
    "hasBarcode": "Has Barcode",
    "missingPrice": "Missing Price",
    "missingImage": "Missing Image"
  }
}
```

### 3.7 i18n: `src/messages/ko/products.json` (add)

```json
{
  "quickFilter": {
    "missingSku": "SKU 없음",
    "hasSku": "SKU 있음",
    "missingBarcode": "바코드 없음",
    "hasBarcode": "바코드 있음",
    "missingPrice": "가격 없음",
    "missingImage": "이미지 없음"
  }
}
```

### 3.8 Sprint 2 Verification

- [ ] `npm run build` passes
- [ ] Quick filter chips render below toolbar
- [ ] Clicking a chip toggles it active/inactive
- [ ] Active chip is `bg-black text-white` (pill style)
- [ ] Filter results update correctly (e.g., "Missing SKU" shows only products with null SKU)
- [ ] Multiple filters work together (AND logic)
- [ ] Clicking same active chip deactivates it
- [ ] Mutually exclusive chips (Missing SKU vs Has SKU): selecting one deactivates the other
- [ ] Page resets to 1 when filter changes
- [ ] i18n works for both en/ko

---

## 4. Sprint 3: Product Detail View

### 4.1 New File: `src/app/api/products/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      shopifyStore: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      productGroup: { select: { id: true, name: true } },
    },
  });

  if (!product) {
    return apiError('NOT_FOUND', 'Product not found', 404);
  }

  return NextResponse.json({ product });
}
```

**Notes:**
- Uses `findFirst` with `isActive: true` filter
- `include` for relations: shopifyStore, vendor, productGroup
- Returns full product object (all fields)
- Next.js 16 dynamic route params are async (`Promise<{ id: string }>`)

### 4.2 File: `src/features/products/types/index.ts` (add)

```typescript
export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  shopifyBarcode: string | null;
  barcodePrefix: string;
  productType: string | null;
  price: string | null;
  compareAtPrice: string | null;
  vendorName: string | null;
  variantTitle: string | null;
  variantOptions: { name: string; value: string }[] | null;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  shopifySynced: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shopifyStore: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  productGroup: { id: string; name: string } | null;
}
```

### 4.3 New File: `src/features/products/hooks/useProduct.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProductDetail } from '../types';

async function fetchProduct(id: string): Promise<{ product: ProductDetail }> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}
```

### 4.4 New File: `src/features/products/components/ProductDetailPanel.tsx`

**Component structure:**

```tsx
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import { useProduct } from '../hooks/useProduct';

interface ProductDetailPanelProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailPanel({ productId, onClose }: ProductDetailPanelProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const { data, isLoading } = useProduct(productId);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (productId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [productId, onClose]);

  if (!productId) return null;

  const product = data?.product;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900 rounded-l-xl">
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={tCommon('button.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-lg text-gray-400">{tCommon('status.loading')}</p>
          </div>
        ) : !product ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-lg text-gray-400">{tCommon('error.notFound')}</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-6">
            {/* Image */}
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={600}
                height={240}
                className="w-full h-48 rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-48 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                {t('card.noImage')}
              </div>
            )}

            {/* Name + Variant */}
            <div>
              <h2 className="text-xl font-bold">{product.name}</h2>
              {product.variantTitle && (
                <p className="text-sm text-gray-400 mt-1">{product.variantTitle}</p>
              )}
              {product.description && (
                <p className="text-sm text-gray-500 mt-2">{product.description}</p>
              )}
            </div>

            {/* Variant Options */}
            {product.variantOptions && product.variantOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.variantOptions.map((opt) => (
                  <span
                    key={opt.name}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {opt.name}: {opt.value}
                  </span>
                ))}
              </div>
            )}

            {/* Details Section */}
            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                {t('detail.details')}
              </h3>
              <div className="grid grid-cols-2 gap-y-3">
                <DetailRow label={t('detail.sku')} value={product.sku} />
                <DetailRow label={t('detail.barcodePrefix')} value={product.barcodePrefix} />
                <DetailRow label={t('detail.price')} value={product.price} />
                <DetailRow label={t('detail.compareAtPrice')} value={product.compareAtPrice} />
                <DetailRow label={t('detail.productType')} value={product.productType} />
                <DetailRow label={t('detail.vendor')} value={product.vendor?.name ?? product.vendorName} />
                <DetailRow label={t('detail.store')} value={product.shopifyStore?.name} />
              </div>
            </div>

            {/* Barcode */}
            {product.shopifyBarcode && (
              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                  {t('detail.barcode')}
                </h3>
                <div className="flex justify-center rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
                  <Barcode value={product.shopifyBarcode} height={40} width={1.5} fontSize={12} />
                </div>
              </div>
            )}

            {/* Shopify Info Section */}
            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                {t('detail.shopifyInfo')}
              </h3>
              <div className="grid grid-cols-2 gap-y-3">
                <DetailRow label={t('detail.shopifyProductId')} value={product.shopifyProductId} />
                <DetailRow label={t('detail.shopifyVariantId')} value={product.shopifyVariantId} />
                <DetailRow label={t('detail.synced')} value={product.shopifySynced ? t('detail.yes') : t('detail.no')} />
                <DetailRow label={t('detail.productGroup')} value={product.productGroup?.name} />
              </div>
            </div>

            {/* Timestamps Section */}
            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
                {t('detail.timestamps')}
              </h3>
              <div className="grid grid-cols-2 gap-y-3">
                <DetailRow label={t('detail.createdAt')} value={new Date(product.createdAt).toLocaleDateString()} />
                <DetailRow label={t('detail.updatedAt')} value={new Date(product.updatedAt).toLocaleDateString()} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </>
  );
}
```

### 4.5 File: `src/features/products/components/ProductList.tsx`

**Add `onProductClick` prop:**

```typescript
interface ProductListProps {
  products: ProductItem[];
  onProductClick?: (id: string) => void;
}
```

**Add to `<tr>` row:**

```tsx
<tr
  key={product.id}
  onClick={() => onProductClick?.(product.id)}
  className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${
    onProductClick ? 'cursor-pointer' : ''
  }`}
>
```

### 4.6 File: `src/features/products/components/ProductCard.tsx`

**Add `onProductClick` prop:**

```typescript
interface ProductCardProps {
  product: ProductItem;
  onClick?: () => void;
}
```

**Add to root `<div>`:**

```tsx
<div
  onClick={onClick}
  className={`rounded-xl border border-gray-200 bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800 hover:shadow-lg transition-shadow ${
    onClick ? 'cursor-pointer' : ''
  }`}
>
```

### 4.7 File: `src/features/products/components/ProductGrid.tsx`

**Add `onProductClick` prop and pass to ProductCard:**

```typescript
interface ProductGridProps {
  products: ProductItem[];
  onProductClick?: (id: string) => void;
}

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={onProductClick ? () => onProductClick(product.id) : undefined}
        />
      ))}
    </div>
  );
}
```

### 4.8 File: `src/app/(dashboard)/products/page.tsx`

**Add state and imports:**

```typescript
import { ProductDetailPanel } from '@/features/products/components/ProductDetailPanel';

const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
```

**Pass to ProductList/ProductGrid:**

```tsx
{view === 'list' ? (
  <ProductList products={data.products} onProductClick={setSelectedProductId} />
) : (
  <ProductGrid products={data.products} onProductClick={setSelectedProductId} />
)}
```

**Add panel at the end (inside the root div):**

```tsx
<ProductDetailPanel
  productId={selectedProductId}
  onClose={() => setSelectedProductId(null)}
/>
```

### 4.9 i18n: `src/messages/en/products.json` (add)

```json
{
  "detail": {
    "details": "Details",
    "sku": "SKU",
    "barcodePrefix": "Barcode Prefix",
    "barcode": "Barcode",
    "price": "Price",
    "compareAtPrice": "Compare at Price",
    "productType": "Product Type",
    "vendor": "Vendor",
    "store": "Store",
    "shopifyInfo": "Shopify Info",
    "shopifyProductId": "Product ID",
    "shopifyVariantId": "Variant ID",
    "synced": "Synced",
    "productGroup": "Product Group",
    "timestamps": "Timestamps",
    "createdAt": "Created",
    "updatedAt": "Updated",
    "yes": "Yes",
    "no": "No"
  }
}
```

### 4.10 i18n: `src/messages/ko/products.json` (add)

```json
{
  "detail": {
    "details": "상세 정보",
    "sku": "SKU",
    "barcodePrefix": "바코드 프리픽스",
    "barcode": "바코드",
    "price": "가격",
    "compareAtPrice": "비교가격",
    "productType": "상품 유형",
    "vendor": "벤더",
    "store": "쇼핑몰",
    "shopifyInfo": "Shopify 정보",
    "shopifyProductId": "상품 ID",
    "shopifyVariantId": "옵션 ID",
    "synced": "동기화",
    "productGroup": "상품 그룹",
    "timestamps": "일시",
    "createdAt": "생성일",
    "updatedAt": "수정일",
    "yes": "예",
    "no": "아니오"
  }
}
```

### 4.11 Sprint 3 Verification

- [ ] `npm run build` passes
- [ ] `GET /api/products/[id]` returns full product data
- [ ] `GET /api/products/[id]` returns 404 for non-existent or inactive product
- [ ] Clicking a row in list view opens slide-over panel
- [ ] Clicking a card in card view opens slide-over panel
- [ ] Panel shows all product fields (image, name, variant, options, details, barcode, shopify info, timestamps)
- [ ] Panel closes on: X button click, backdrop click, Escape key
- [ ] Panel has loading state while fetching
- [ ] Panel styling matches bkit.ai design (rounded-xl, section headers, gray borders)
- [ ] `cursor-pointer` on clickable rows/cards
- [ ] i18n works for both en/ko in panel labels

---

## 5. Complete File Change Matrix

| # | File | Sprint 1 | Sprint 2 | Sprint 3 |
|---|------|:--------:|:--------:|:--------:|
| 1 | `src/app/globals.css` | Modify | | |
| 2 | `src/app/layout.tsx` | Modify | | |
| 3 | `src/components/ThemeToggle.tsx` | **Create** | | |
| 4 | `src/app/(dashboard)/layout.tsx` | Modify | | |
| 5 | `src/messages/en/common.json` | Modify | | |
| 6 | `src/messages/ko/common.json` | Modify | | |
| 7 | `src/features/products/types/index.ts` | | Modify | Modify |
| 8 | `src/app/api/products/route.ts` | | Modify | |
| 9 | `src/features/products/hooks/useProducts.ts` | | Modify | |
| 10 | `src/features/products/components/QuickFilters.tsx` | | **Create** | |
| 11 | `src/app/(dashboard)/products/page.tsx` | | Modify | Modify |
| 12 | `src/messages/en/products.json` | | Modify | Modify |
| 13 | `src/messages/ko/products.json` | | Modify | Modify |
| 14 | `src/app/api/products/[id]/route.ts` | | | **Create** |
| 15 | `src/features/products/hooks/useProduct.ts` | | | **Create** |
| 16 | `src/features/products/components/ProductDetailPanel.tsx` | | | **Create** |
| 17 | `src/features/products/components/ProductList.tsx` | | | Modify |
| 18 | `src/features/products/components/ProductCard.tsx` | | | Modify |
| 19 | `src/features/products/components/ProductGrid.tsx` | | | Modify |

**Total: 5 new files, 14 modified files = 19 file changes**

---

## 6. Design Tokens Reference (bkit.ai)

All new components must follow these tokens:

| Token | Value |
|-------|-------|
| Active chip/button | `bg-black text-white rounded-full` (dark: `bg-white text-black`) |
| Inactive chip/button | `border border-gray-200 text-gray-500 rounded-full` |
| Section header | `text-xs uppercase tracking-wider text-gray-400 font-medium` |
| Card/container | `rounded-xl border border-gray-200` |
| Focus ring | `focus:ring-2 focus:ring-black` (dark: `focus:ring-zinc-400`) |
| Icon button | `rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800` |
| Separator | `border-t border-gray-100 dark:border-zinc-800` |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-07 | Initial design | BDJ Team |
