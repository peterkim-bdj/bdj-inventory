# Products Enhancement Plan

> **Status**: Draft
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Created**: 2026-02-07
> **PDCA Cycle**: #1

---

## 1. Overview

3가지 기능을 Products 페이지에 추가:

| # | Feature | Summary |
|---|---------|---------|
| 1 | Advanced Search Filters | SKU/바코드 유무 필터, 가격 유무 필터 등 "Quick Filter" 칩 UI |
| 2 | Product Detail View | 리스트/카드에서 클릭 시 모든 필드를 보여주는 상세 뷰 (read-only) |
| 3 | Dark Mode Toggle | 기본 다크모드 + 헤더 우측 상단 라이트/다크 전환 버튼 |

---

## 2. Feature 1: Advanced Search Filters (Quick Filter Chips)

### 2.1 Problem

현재 검색은 텍스트 기반(`name`, `sku`, `shopifyBarcode` contains)만 지원. "SKU 없는 상품", "바코드 없는 상품" 같은 null/non-null 필터가 불가능하여 데이터 품질 확인이 어려움.

### 2.2 Solution: Quick Filter Chips

검색/필터 영역 아래에 토글 가능한 **Quick Filter Chips** 행 추가.

```
[Missing SKU] [Missing Barcode] [Missing Price] [Missing Image] [Has Variants]
```

**UI Design** (bkit.ai style):
- Container: `flex flex-wrap gap-2` row below the toolbar
- Inactive chip: `rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-500`
- Active chip: `rounded-full bg-black text-white px-3 py-1 text-sm` (dark: inverted)
- Multiple chips can be active simultaneously (AND logic)
- Click to toggle on/off

**Chips available:**

| Chip Label (en) | Chip Label (ko) | API param | Prisma filter |
|-----------------|-----------------|-----------|---------------|
| Missing SKU | SKU 없음 | `missingSku=true` | `sku: null` |
| Has SKU | SKU 있음 | `missingSku=false` | `sku: { not: null }` |
| Missing Barcode | 바코드 없음 | `missingBarcode=true` | `shopifyBarcode: null` |
| Has Barcode | 바코드 있음 | `missingBarcode=false` | `shopifyBarcode: { not: null }` |
| Missing Price | 가격 없음 | `missingPrice=true` | `price: null` |
| Missing Image | 이미지 없음 | `missingImage=true` | `imageUrl: null` |

### 2.3 Implementation Plan

#### API Changes (`src/app/api/products/route.ts`)
- Add optional query params to Zod schema: `missingSku`, `missingBarcode`, `missingPrice`, `missingImage`
- Type: `z.enum(['true', 'false']).optional()` for each
- Add to `where` clause: e.g., `missingSku === 'true'` → `where.sku = null`, `missingSku === 'false'` → `where.sku = { not: null }`

#### Types (`src/features/products/types/index.ts`)
- Add new query params to `productQuerySchema`

#### Hook (`src/features/products/hooks/useProducts.ts`)
- Add new params to `UseProductsParams` interface
- Pass them as search params

#### New Component: `QuickFilters.tsx`
- Location: `src/features/products/components/QuickFilters.tsx`
- Props: `{ activeFilters: Record<string, boolean>; onToggle: (key: string) => void }`
- Renders chip buttons with active/inactive styling
- Uses `useTranslations('products')` for chip labels

#### Page Integration (`src/app/(dashboard)/products/page.tsx`)
- Add state: `const [quickFilters, setQuickFilters] = useState<Record<string, boolean>>({})`
- Place `<QuickFilters>` between toolbar row and content
- Pass quickFilters to `useProducts` hook

#### i18n (`src/messages/{en,ko}/products.json`)
- Add `quickFilter` namespace with chip labels

### 2.4 Files to Modify/Create

| Action | File |
|--------|------|
| Modify | `src/features/products/types/index.ts` |
| Modify | `src/app/api/products/route.ts` |
| Modify | `src/features/products/hooks/useProducts.ts` |
| **Create** | `src/features/products/components/QuickFilters.tsx` |
| Modify | `src/app/(dashboard)/products/page.tsx` |
| Modify | `src/messages/en/products.json` |
| Modify | `src/messages/ko/products.json` |

---

## 3. Feature 2: Product Detail View

### 3.1 Problem

현재 리스트/카드 뷰에서는 주요 필드만 표시. `description`, `compareAtPrice`, `shopifyProductId`, `shopifyVariantId`, `barcodePrefix`, `productGroupId`, `shopifySynced`, `createdAt`, `updatedAt` 등 상세 정보를 볼 방법이 없음.

### 3.2 Solution: Slide-over Detail Panel

리스트 row 또는 카드를 클릭하면 **오른쪽에서 슬라이드인하는 패널** (slide-over)로 상세 정보 표시. 모달보다 덜 방해되고, bkit.ai 스타일에 적합.

**Alternative considered**: 별도 `/products/[id]` 페이지 → 현재 edit 기능이 없고 view-only이므로 slide-over가 더 적합. 나중에 edit이 필요해지면 별도 페이지로 전환 가능.

### 3.3 UI Design

**Slide-over Panel:**
- Overlay: `fixed inset-0 z-50` with `bg-black/30` backdrop
- Panel: `fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl`
- Animation: slide from right (`translate-x-full` → `translate-x-0`)
- Close: X button top-right + click backdrop + Escape key
- Container: `rounded-l-xl` (left corners only, since it's flush right)

**Content layout:**

```
┌─────────────────────────────────┐
│  [X Close]                      │
│                                 │
│  [Product Image - full width]   │
│  rounded-xl, h-48 object-cover  │
│                                 │
│  Product Name          (bold)   │
│  Variant Title         (gray)   │
│                                 │
│  ┌─ Variant Options ──────────┐ │
│  │ [Color: Red] [Size: Large] │ │
│  └────────────────────────────┘ │
│                                 │
│  ── Details ──────────────────  │
│  SKU             ABC-123        │
│  Barcode         [=barcode=]    │
│  Barcode Prefix  BDJ-001        │
│  Price           $29.99         │
│  Compare Price   $39.99         │
│  Product Type    T-Shirt        │
│  Vendor          Nike           │
│  Store           Store A        │
│                                 │
│  ── Shopify Info ─────────────  │
│  Product ID      123456789      │
│  Variant ID      987654321      │
│  Synced          ✓ Yes          │
│  Product Group   Group-ABC      │
│                                 │
│  ── Timestamps ───────────────  │
│  Created         2026-01-15     │
│  Updated         2026-02-07     │
└─────────────────────────────────┘
```

**Styling details:**
- Section headers: `text-xs uppercase tracking-wider text-gray-400 font-medium` (matches table headers)
- Labels: `text-sm text-gray-500` (left column)
- Values: `text-sm font-medium` (right column)
- Detail rows: `grid grid-cols-2 gap-y-3 py-4` per section
- Sections separated by `border-t border-gray-100 dark:border-zinc-800`
- Barcode rendered with existing `<Barcode>` component
- Variant chips: same `rounded-full bg-gray-100` style as ProductCard

### 3.4 API Changes

현재 API의 `select`에는 `shopifyProductId`, `shopifyVariantId`, `shopifySynced`, `productGroupId` 필드가 포함되지 않음.

**Option A**: 기존 list API에 이 필드들 추가 (간단하지만 list에 불필요한 데이터)
**Option B**: 새 `/api/products/[id]` 엔드포인트 생성 (깔끔한 분리)

**Decision: Option B** — 별도 `GET /api/products/[id]` 엔드포인트 생성
- 모든 필드 반환 (select 없이, 또는 필요 필드만)
- 나중에 edit 기능 추가 시 같은 엔드포인트에 PUT 추가 가능

### 3.5 Implementation Plan

#### New API Route: `src/app/api/products/[id]/route.ts`
- `GET /api/products/[id]`
- Returns full product data including Shopify IDs, sync status, group info
- 404 if not found or not active

#### New Type: `ProductDetail`
- Extends `ProductItem` with: `shopifyProductId`, `shopifyVariantId`, `shopifySynced`, `productGroupId`
- Add to `src/features/products/types/index.ts`

#### New Hook: `useProduct(id)`
- Location: `src/features/products/hooks/useProduct.ts`
- React Query hook for single product fetch
- `queryKey: ['product', id]`, enabled only when id is truthy

#### New Component: `ProductDetailPanel.tsx`
- Location: `src/features/products/components/ProductDetailPanel.tsx`
- Props: `{ productId: string | null; onClose: () => void }`
- Uses `useProduct(productId)` hook
- Slide-over panel with all fields displayed
- Loading state: skeleton or spinner inside panel
- Keyboard: Escape to close
- Trap focus inside panel for accessibility

#### Modify: ProductList, ProductCard, ProductGrid
- Add `onProductClick` prop
- Wrap rows/cards with `onClick` → `cursor-pointer`

#### Page Integration
- Add state: `const [selectedProductId, setSelectedProductId] = useState<string | null>(null)`
- Pass `onProductClick={setSelectedProductId}` to ProductList/ProductGrid
- Render `<ProductDetailPanel productId={selectedProductId} onClose={() => setSelectedProductId(null)} />`

#### i18n
- Add `detail` namespace to products translations with all field labels

### 3.6 Files to Modify/Create

| Action | File |
|--------|------|
| **Create** | `src/app/api/products/[id]/route.ts` |
| Modify | `src/features/products/types/index.ts` |
| **Create** | `src/features/products/hooks/useProduct.ts` |
| **Create** | `src/features/products/components/ProductDetailPanel.tsx` |
| Modify | `src/features/products/components/ProductList.tsx` |
| Modify | `src/features/products/components/ProductCard.tsx` |
| Modify | `src/features/products/components/ProductGrid.tsx` |
| Modify | `src/app/(dashboard)/products/page.tsx` |
| Modify | `src/messages/en/products.json` |
| Modify | `src/messages/ko/products.json` |

---

## 4. Feature 3: Dark Mode Toggle

### 4.1 Problem

현재 다크모드는 `prefers-color-scheme: dark` 미디어 쿼리 기반 (OS 설정 따름). 수동 전환 불가. 사용자 요청: 기본 다크모드 + 라이트 전환 가능.

### 4.2 Solution: Class-based Dark Mode with Toggle

Tailwind CSS v4에서 `@custom-variant dark (&:where(.dark, .dark *))` 사용하여 class 기반 다크모드로 전환. 헤더 우측 상단에 토글 버튼 배치.

**Key changes:**
1. `globals.css`: `prefers-color-scheme` 미디어 쿼리 → class 기반 dark mode
2. `layout.tsx`: `<html>` 태그에 기본 `className="dark"` 적용
3. New `ThemeToggle` component: cookie에 테마 저장, `<html>` class 토글
4. Header에 ThemeToggle 배치 (LanguageSwitcher 옆)

### 4.3 UI Design

**Toggle button** (bkit.ai style, header 우측):
- Sun icon (라이트 모드) / Moon icon (다크 모드)
- 아이콘은 간단한 SVG inline (외부 라이브러리 없이)
- Button: `rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`
- 현재 모드에 맞는 아이콘만 표시 (dark 일 때 sun 아이콘, light 일 때 moon 아이콘)

**Theme persistence:**
- Cookie: `NEXT_THEME` (기존 `NEXT_LOCALE` 패턴 따름)
- Default: `dark`
- Values: `light` | `dark`
- 1년 만료

**Header layout:**
```
[BDJ Inventory]  [Shops] [Products]          [🌙/☀️] [EN/KO]
```

### 4.4 Implementation Plan

#### globals.css
- Remove `@media (prefers-color-scheme: dark)` blocks
- Add `@custom-variant dark (&:where(.dark, .dark *))` for Tailwind v4 class-based dark
- Move dark CSS variables under `.dark` selector instead of media query
- Update focus ring dark mode to use `.dark` selector

#### layout.tsx (Server Component)
- Read `NEXT_THEME` cookie (default: `dark`)
- Apply `className="dark"` or `""` to `<html>` tag based on cookie
- Add inline `<script>` to prevent FOUC (flash of unstyled content):
  ```html
  <script dangerouslySetInnerHTML={{ __html: `
    (function(){
      var t = document.cookie.match(/NEXT_THEME=(\w+)/);
      var theme = t ? t[1] : 'dark';
      if (theme === 'dark') document.documentElement.classList.add('dark');
    })()
  `}} />
  ```

#### New Component: `ThemeToggle.tsx`
- Location: `src/components/ThemeToggle.tsx`
- Client component (`'use client'`)
- Reads current theme from `<html>` class
- On click: toggle `dark` class on `<html>`, set `NEXT_THEME` cookie, `router.refresh()`
- Sun/Moon SVG icons inline (no library)
- Uses `useTranslations('common')` for aria-label

#### Dashboard layout.tsx
- Import `ThemeToggle`
- Place next to `LanguageSwitcher` in header right section

#### i18n
- Add `theme.light`, `theme.dark`, `theme.toggle` keys to common.json

### 4.5 Files to Modify/Create

| Action | File |
|--------|------|
| Modify | `src/app/globals.css` |
| Modify | `src/app/layout.tsx` |
| **Create** | `src/components/ThemeToggle.tsx` |
| Modify | `src/app/(dashboard)/layout.tsx` |
| Modify | `src/messages/en/common.json` |
| Modify | `src/messages/ko/common.json` |

---

## 5. Implementation Order

3 features는 독립적이므로 어느 순서든 가능하지만, 권장 순서:

```
Sprint 1: Feature 3 (Dark Mode Toggle)
  → 기반 인프라 변경 (globals.css, layout.tsx)
  → 다른 기능 구현 시 dark mode가 즉시 확인 가능

Sprint 2: Feature 1 (Quick Filter Chips)
  → API + UI 변경, 비교적 간단
  → 기존 컴포넌트 수정 적음

Sprint 3: Feature 2 (Product Detail View)
  → 가장 큰 기능 (새 API + 새 컴포넌트 + 기존 컴포넌트 수정)
  → Dark mode + filters가 먼저 완성된 상태에서 작업
```

---

## 6. Total File Changes Summary

| Action | Count | Files |
|--------|:-----:|-------|
| Create | 5 | `QuickFilters.tsx`, `ProductDetailPanel.tsx`, `useProduct.ts`, `products/[id]/route.ts`, `ThemeToggle.tsx` |
| Modify | 13 | `globals.css`, `layout.tsx` (root), `layout.tsx` (dashboard), `page.tsx`, `types/index.ts`, `route.ts` (products), `useProducts.ts`, `ProductList.tsx`, `ProductCard.tsx`, `ProductGrid.tsx`, `en/products.json`, `ko/products.json`, `en/common.json`, `ko/common.json` |
| **Total** | **18** | |

---

## 7. Non-Functional Requirements

| Item | Target |
|------|--------|
| Build | `npm run build` passes with 0 errors |
| Dark mode | Default dark, toggle to light, persisted in cookie |
| i18n | All new UI text in en + ko |
| Design consistency | bkit.ai design tokens (rounded-xl, rounded-full, black/white palette) |
| Accessibility | Keyboard navigation (Escape closes panel), aria-labels on buttons |
| Performance | Single product fetch only on panel open (not preloaded) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-07 | Initial plan | BDJ Team |
