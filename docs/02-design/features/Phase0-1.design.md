# Phase 0-1: Shop 관리 & Product 초기 데이터 구축 - Design Document

> **Summary**: Shop CRUD, Shopify GraphQL Sync, Diff Review, ProductGroup 자동 매핑의 상세 기술 설계
>
> **Project**: BDJ Inventory
> **Author**: BDJ Team
> **Date**: 2026-02-06
> **Status**: Draft
> **Planning Doc**: [Phase0-1.plan.md](../01-plan/features/Phase0-1.plan.md)
> **Original Spec**: [Phase 0-1. Product 초기 데이터 구축](../../Phase%200-1.%20%20Product%20초기%20데이터%20구축%20-%20BDJ%20Inventory.md)

---

## 1. Overview

### 1.1 Design Goals

- Shopify 4개 몰을 유연하게 추가/관리하는 Shop CRUD
- Shopify GraphQL Admin API를 통한 상품 데이터 동기화
- 재동기화 시 Diff Review로 안전한 변경사항 반영
- SKU/바코드 기반 크로스 스토어 ProductGroup 자동 매핑
- 모든 UI 텍스트는 i18n 번역 키 사용 (i18n feature 참조)

### 1.2 Design Principles

- **Shopify as source of truth**: Shopify 데이터가 기준, BDJ DB는 동기화 대상
- **Safe by default**: 재동기화 시 삭제 기본값은 "유지", 사용자 확인 후 반영
- **Transactional**: Sync 중 실패 시 부분 반영 방지
- **Progressive**: 몰을 하나씩 추가하며 단계적 구축

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js Client)                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐    │
│  │ Shop List   │ │ Diff Review │ │ Product View       │    │
│  │ Shop Form   │ │ (Tabs)      │ │ (List/Card/Filter) │    │
│  └──────┬──────┘ └──────┬──────┘ └─────────┬──────────┘    │
└─────────┼───────────────┼──────────────────┼────────────────┘
          │               │                  │
          ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Routes                                          │
│  /api/shops         (CRUD)                                   │
│  /api/shops/:id/sync (Start sync)                            │
│  /api/shops/:id/sync/diff (Get diff)                         │
│  /api/shops/:id/sync/apply (Apply diff)                      │
│  /api/shops/:id/sync/logs (Sync history)                     │
│  /api/shops/sync-all (Sync all)                              │
│  /api/products      (Query)                                  │
│  /api/product-groups (Query)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│ Shopify      │ │ Prisma   │ │ Sync     │
│ GraphQL      │ │ ORM      │ │ Engine   │
│ Client       │ │          │ │          │
└──────┬───────┘ └────┬─────┘ └────┬─────┘
       │              │            │
       ▼              ▼            ▼
┌──────────────┐ ┌───────────────────────┐
│ Shopify      │ │ PostgreSQL             │
│ Admin API    │ │ (ShopifyStore, Product,│
│ (External)   │ │  ProductGroup, Vendor, │
│              │ │  SyncLog)              │
└──────────────┘ └───────────────────────┘
```

### 2.2 Sync Data Flow

```
[POST /api/shops/:id/sync]
    │
    ├─ Is this first sync? (no products in DB for this shop)
    │
    ├─ YES: Initial Sync
    │   │
    │   ├─ Shopify GraphQL → Fetch all active products (paginated)
    │   ├─ Extract vendor names → Vendor upsert (name only)
    │   ├─ Create Product records (with vendorId, shopifyStoreId)
    │   ├─ Generate barcodePrefix for each Product
    │   ├─ ProductGroup auto-mapping (SKU → barcode → null)
    │   ├─ Update ShopifyStore (lastSyncedAt, syncStatus: SYNCED, productCount)
    │   ├─ Create SyncLog (INITIAL, COMPLETED)
    │   └─ Return summary: { products: N, vendors: M }
    │
    └─ NO: Re-Sync with Diff Review
        │
        ├─ Shopify GraphQL → Fetch all active products (paginated)
        ├─ Compare with existing DB records
        │   ├─ Match by: shopifyStoreId + shopifyProductId + shopifyVariantId
        │   ├─ NEW: in Shopify but not in DB
        │   ├─ MODIFIED: in both but fields differ
        │   ├─ REMOVED: in DB but not in Shopify
        │   └─ UNCHANGED: identical
        ├─ Save diff to SyncLog.diffData (JSON)
        ├─ Update ShopifyStore.syncStatus → DIFF_REVIEW
        └─ Return: { new: N, modified: N, removed: N, unchanged: N }

[GET /api/shops/:id/sync/diff]
    └─ Return SyncLog.diffData (latest DIFF_REVIEW log)

[POST /api/shops/:id/sync/apply]
    │
    ├─ Body: { approvedIds: string[] }
    ├─ For each approved item:
    │   ├─ NEW → Create Product + Vendor upsert + ProductGroup mapping
    │   ├─ MODIFIED → Update Product fields
    │   └─ REMOVED (if user selected deactivate) → Product.isActive = false
    ├─ Update SyncLog (appliedCount, status: COMPLETED)
    └─ Update ShopifyStore (lastSyncedAt, syncStatus: SYNCED, productCount)
```

### 2.3 ProductGroup Auto-Mapping Flow

```
[After Product create/update]
    │
    ├─ Product has SKU?
    │   ├─ YES → Search ProductGroup by canonicalSku = Product.sku
    │   │   ├─ Found → Link Product.productGroupId = group.id
    │   │   └─ Not found → Search other Products (different store) with same SKU
    │   │       ├─ Found → Create ProductGroup + link both
    │   │       └─ Not found → (continue to barcode check)
    │   │
    │   └─ NO → Continue
    │
    ├─ Product has shopifyBarcode?
    │   ├─ YES → Search ProductGroup by canonicalBarcode = Product.shopifyBarcode
    │   │   ├─ Found → Link
    │   │   └─ Not found → Search other Products with same barcode
    │   │       ├─ Found → Create ProductGroup + link both
    │   │       └─ Not found → productGroupId = null
    │   └─ NO → productGroupId = null
    │
    └─ Result: Product either linked to a ProductGroup or left unmapped
```

---

## 3. Data Model

### 3.1 Prisma Schema (Phase 0-1 scope)

> Full schema: [Schema Reference](../../Schema%20Reference%20-%20BDJ%20Inventory.md)

```prisma
// ---- Phase 0-1 Models ----

model ShopifyStore {
  id              String            @id @default(cuid())
  name            String
  domain          String            @unique
  accessToken     String                                    // encrypted
  apiVersion      String            @default("2025-01")
  isActive        Boolean           @default(true)
  lastSyncedAt    DateTime?
  syncStatus      ShopSyncStatus    @default(NEVER)
  productCount    Int               @default(0)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  products        Product[]
  syncLogs        SyncLog[]
}

enum ShopSyncStatus {
  NEVER
  SYNCED
  IN_PROGRESS
  DIFF_REVIEW
  FAILED
}

model SyncLog {
  id                String          @id @default(cuid())
  shopifyStoreId    String
  shopifyStore      ShopifyStore    @relation(fields: [shopifyStoreId], references: [id])
  syncType          SyncType
  status            SyncLogStatus   @default(FETCHING)
  totalFetched      Int             @default(0)
  newCount          Int             @default(0)
  modifiedCount     Int             @default(0)
  removedCount      Int             @default(0)
  unchangedCount    Int             @default(0)
  appliedCount      Int             @default(0)
  diffData          Json?
  startedAt         DateTime        @default(now())
  completedAt       DateTime?
  error             String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([shopifyStoreId])
  @@index([status])
}

enum SyncType { INITIAL  RESYNC }
enum SyncLogStatus { FETCHING  DIFF_REVIEW  APPLYING  COMPLETED  FAILED }

model Vendor {
  id            String    @id @default(cuid())
  name          String    @unique
  code          String?   @unique
  contactName   String?
  phone         String?
  email         String?
  website       String?
  address       String?
  notes         String?
  autoNotify    Boolean   @default(false)
  minLeadDays   Int       @default(3)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  products       Product[]
  productGroups  ProductGroup[]
}

model ProductGroup {
  id                String    @id @default(cuid())
  canonicalSku      String?   @unique
  canonicalBarcode  String?   @unique
  name              String
  productType       String?
  vendorId          String?
  vendor            Vendor?   @relation(fields: [vendorId], references: [id])
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  products          Product[]
}

model Product {
  id                String    @id @default(cuid())
  name              String
  description       String?
  imageUrl          String?
  sku               String?
  shopifyBarcode    String?
  barcodePrefix     String    @unique
  productType       String?
  price             Decimal?
  compareAtPrice    Decimal?
  vendorId          String?
  vendor            Vendor?   @relation(fields: [vendorId], references: [id])
  vendorName        String?
  shopifyProductId  String?
  shopifyVariantId  String?
  shopifyStoreId    String?
  shopifyStore      ShopifyStore? @relation(fields: [shopifyStoreId], references: [id])
  shopifySynced     Boolean   @default(true)
  productGroupId    String?
  productGroup      ProductGroup? @relation(fields: [productGroupId], references: [id])
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([sku])
  @@index([shopifyBarcode])
  @@index([name])
  @@index([vendorId])
  @@index([productType])
  @@index([shopifyStoreId])
  @@index([productGroupId])
  @@unique([shopifyStoreId, shopifyProductId, shopifyVariantId])
}
```

### 3.2 barcodePrefix Generation

```typescript
// 6-character alphanumeric, prefixed with "BDJ-"
// Example: "BDJ-A1B2C3"
function generateBarcodePrefix(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BDJ-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
// Ensure uniqueness via DB unique constraint + retry on collision
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/shops` | Shop list with status | — |
| POST | `/api/shops` | Create shop | — |
| GET | `/api/shops/:id` | Shop detail | — |
| PUT | `/api/shops/:id` | Update shop | — |
| DELETE | `/api/shops/:id` | Soft delete shop | — |
| POST | `/api/shops/:id/sync` | Start sync | — |
| POST | `/api/shops/sync-all` | Sync all active shops | — |
| GET | `/api/shops/:id/sync/diff` | Get current diff | — |
| POST | `/api/shops/:id/sync/apply` | Apply selected diff items | — |
| GET | `/api/shops/:id/sync/logs` | Sync history | — |
| GET | `/api/products` | Product list with filters | — |
| GET | `/api/product-groups` | Product groups | — |

> Auth: Phase 0-1 has no authentication (added in later phase with User model)

### 4.2 Shop APIs

#### `POST /api/shops`

**Request:**
```json
{
  "name": "Store A",
  "domain": "store-a.myshopify.com",
  "accessToken": "shpat_xxx",
  "apiVersion": "2025-01"
}
```

**Validation (Zod):**
```typescript
const createShopSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().regex(/^[a-z0-9-]+\.myshopify\.com$/),
  accessToken: z.string().min(1),
  apiVersion: z.string().default('2025-01'),
});
```

**Response (201):**
```json
{
  "id": "clxxx...",
  "name": "Store A",
  "domain": "store-a.myshopify.com",
  "apiVersion": "2025-01",
  "syncStatus": "NEVER",
  "productCount": 0,
  "lastSyncedAt": null,
  "isActive": true
}
```

#### `GET /api/shops`

**Response (200):**
```json
{
  "shops": [
    {
      "id": "clxxx...",
      "name": "Store A",
      "domain": "store-a.myshopify.com",
      "productCount": 245,
      "lastSyncedAt": "2026-02-05T14:30:00Z",
      "syncStatus": "SYNCED",
      "isActive": true
    }
  ]
}
```

#### `DELETE /api/shops/:id`

**Response (200):**
```json
{
  "id": "clxxx...",
  "isActive": false,
  "deactivatedProducts": 245
}
```
- Sets `ShopifyStore.isActive = false`
- Sets all related `Product.shopifySynced = false`

### 4.3 Sync APIs

#### `POST /api/shops/:id/sync`

**Response (200) — Initial Sync:**
```json
{
  "syncLogId": "clxxx...",
  "syncType": "INITIAL",
  "status": "COMPLETED",
  "summary": {
    "totalFetched": 245,
    "newCount": 245,
    "vendorsCreated": 12
  }
}
```

**Response (200) — Re-Sync:**
```json
{
  "syncLogId": "clxxx...",
  "syncType": "RESYNC",
  "status": "DIFF_REVIEW",
  "summary": {
    "totalFetched": 250,
    "newCount": 12,
    "modifiedCount": 5,
    "removedCount": 3,
    "unchangedCount": 230
  }
}
```

#### `GET /api/shops/:id/sync/diff`

**Response (200):**
```json
{
  "syncLogId": "clxxx...",
  "shopName": "Store A",
  "summary": {
    "new": 12,
    "modified": 5,
    "removed": 3,
    "unchanged": 230
  },
  "items": [
    {
      "id": "diff_001",
      "type": "NEW",
      "shopifyProductId": "7234567890",
      "shopifyVariantId": "4567890123",
      "data": {
        "name": "New Product",
        "sku": "NP-001",
        "price": "45000",
        "vendorName": "Nike"
      },
      "defaultAction": "add"
    },
    {
      "id": "diff_002",
      "type": "MODIFIED",
      "shopifyProductId": "7234567891",
      "shopifyVariantId": "4567890124",
      "productId": "clxxx...",
      "changes": [
        { "field": "price", "old": "45000", "new": "42000" },
        { "field": "imageUrl", "old": "https://old...", "new": "https://new..." }
      ],
      "defaultAction": "update"
    },
    {
      "id": "diff_003",
      "type": "REMOVED",
      "productId": "clxxx...",
      "data": {
        "name": "Old Product",
        "sku": "OP-001"
      },
      "defaultAction": "keep"
    }
  ]
}
```

#### `POST /api/shops/:id/sync/apply`

**Request:**
```json
{
  "syncLogId": "clxxx...",
  "actions": [
    { "diffId": "diff_001", "action": "add" },
    { "diffId": "diff_002", "action": "update" },
    { "diffId": "diff_003", "action": "keep" }
  ]
}
```

**Response (200):**
```json
{
  "applied": 2,
  "skipped": 1,
  "syncStatus": "COMPLETED"
}
```

### 4.4 Product APIs

#### `GET /api/products`

**Query Parameters:**
```typescript
interface ProductQueryParams {
  search?: string;            // name, SKU, barcode search
  storeIds?: string[];        // multi-select filter
  vendorIds?: string[];       // multi-select filter
  productTypes?: string[];    // multi-select filter
  hasStock?: 'all' | 'inStock' | 'outOfStock';
  sortBy?: 'name' | 'price' | 'updatedAt' | 'vendorName';
  sortOrder?: 'asc' | 'desc';
  page?: number;              // default 1
  limit?: number;             // default 20
}
```

**Response (200):**
```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 245,
    "totalPages": 13
  },
  "filters": {
    "stores": [
      { "id": "clxxx", "name": "Store A", "count": 245 }
    ],
    "vendors": [
      { "id": "clxxx", "name": "Nike", "count": 80 }
    ],
    "productTypes": [
      { "value": "Shoes", "count": 120 }
    ]
  }
}
```

---

## 5. Shopify GraphQL Client

### 5.1 Products Query

```typescript
// src/lib/shopify/client.ts

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      edges {
        node {
          id
          title
          descriptionHtml
          vendor
          productType
          status
          featuredImage {
            url
          }
          variants(first: 100) {
            edges {
              node {
                id
                sku
                barcode
                price
                compareAtPrice
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface ShopifyClientConfig {
  domain: string;
  accessToken: string;
  apiVersion: string;
}

async function fetchAllProducts(config: ShopifyClientConfig) {
  const products = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response = await fetch(
      `https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': config.accessToken,
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { first: 50, after: cursor },
        }),
      }
    );

    const data = await response.json();
    const { edges, pageInfo } = data.data.products;

    for (const edge of edges) {
      products.push(edge.node);
    }

    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  return products;
}
```

### 5.2 Data Transformation

```typescript
// src/lib/shopify/transform.ts

interface ShopifyProduct {
  id: string;           // "gid://shopify/Product/7234567890"
  title: string;
  vendor: string;
  // ...
}

function extractNumericId(gid: string): string {
  // "gid://shopify/Product/7234567890" → "7234567890"
  return gid.split('/').pop()!;
}

function transformToProductData(shopifyProduct: ShopifyProduct, storeId: string) {
  return shopifyProduct.variants.edges.map(({ node: variant }) => ({
    name: shopifyProduct.title,
    description: shopifyProduct.descriptionHtml || null,
    imageUrl: shopifyProduct.featuredImage?.url || null,
    sku: variant.sku || null,
    shopifyBarcode: variant.barcode || null,
    productType: shopifyProduct.productType || null,
    price: variant.price ? new Decimal(variant.price) : null,
    compareAtPrice: variant.compareAtPrice ? new Decimal(variant.compareAtPrice) : null,
    vendorName: shopifyProduct.vendor || null,
    shopifyProductId: extractNumericId(shopifyProduct.id),
    shopifyVariantId: extractNumericId(variant.id),
    shopifyStoreId: storeId,
  }));
}
```

---

## 6. Diff Generation Logic

### 6.1 Comparison Algorithm

```typescript
// src/features/shops/services/diff.ts

interface DiffItem {
  id: string;
  type: 'NEW' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productId?: string;          // existing DB product id
  data?: Record<string, any>;  // new/current data
  changes?: FieldChange[];     // for MODIFIED
  defaultAction: 'add' | 'update' | 'keep' | 'deactivate';
}

interface FieldChange {
  field: string;
  old: string | number | null;
  new: string | number | null;
}

const COMPARE_FIELDS = [
  'name', 'description', 'sku', 'shopifyBarcode',
  'productType', 'price', 'compareAtPrice', 'imageUrl', 'vendorName'
] as const;

function generateDiff(
  shopifyProducts: TransformedProduct[],
  dbProducts: Product[]
): DiffItem[] {
  const diff: DiffItem[] = [];
  const dbMap = new Map(
    dbProducts.map(p => [`${p.shopifyProductId}:${p.shopifyVariantId}`, p])
  );
  const shopifyKeys = new Set<string>();

  // Check each Shopify product against DB
  for (const sp of shopifyProducts) {
    const key = `${sp.shopifyProductId}:${sp.shopifyVariantId}`;
    shopifyKeys.add(key);
    const dbProduct = dbMap.get(key);

    if (!dbProduct) {
      // NEW
      diff.push({
        id: `new_${key}`,
        type: 'NEW',
        shopifyProductId: sp.shopifyProductId,
        shopifyVariantId: sp.shopifyVariantId,
        data: sp,
        defaultAction: 'add',
      });
    } else {
      // Compare fields
      const changes: FieldChange[] = [];
      for (const field of COMPARE_FIELDS) {
        const oldVal = String(dbProduct[field] ?? '');
        const newVal = String(sp[field] ?? '');
        if (oldVal !== newVal) {
          changes.push({ field, old: dbProduct[field], new: sp[field] });
        }
      }

      if (changes.length > 0) {
        // MODIFIED
        diff.push({
          id: `mod_${key}`,
          type: 'MODIFIED',
          productId: dbProduct.id,
          shopifyProductId: sp.shopifyProductId,
          shopifyVariantId: sp.shopifyVariantId,
          changes,
          defaultAction: 'update',
        });
      }
      // else: UNCHANGED (not included in diff items)
    }
  }

  // Check DB products not in Shopify → REMOVED
  for (const [key, dbProduct] of dbMap) {
    if (!shopifyKeys.has(key)) {
      diff.push({
        id: `rem_${key}`,
        type: 'REMOVED',
        productId: dbProduct.id,
        data: { name: dbProduct.name, sku: dbProduct.sku },
        defaultAction: 'keep',
      });
    }
  }

  return diff;
}
```

---

## 7. UI/UX Design

### 7.1 Shop List Page (`/shops`)

```
┌──────────────────────────────────────────────────────────────────┐
│  {t('shops.title')}                                  [+ {t('shops.addShop')}]│
│                                                                    │
│  Name       Domain                    Products  Last Synced  Status  Actions │
│  ────────────────────────────────────────────────────────────────── │
│  Store A   store-a.myshopify.com     245     Feb 5, 2:30PM  ✅ Synced  [Sync][Edit][Del] │
│  Store B   store-b.myshopify.com     180     Feb 4, 9:15AM  ✅ Synced  [Sync][Edit][Del] │
│  Store C   store-c.myshopify.com      —          —          ⬜ Never   [Sync][Edit][Del] │
│                                                                    │
│                                  [{t('shops.syncAll')}]           │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Diff Review Page (`/shops/[id]/sync`)

```
┌──────────────────────────────────────────────────────────────┐
│  Store A — {t('sync.diffReview.title')}                       │
│                                                                │
│  Summary: 🟢 New 12  🟡 Modified 5  🔴 Removed 3  ⚪ Same 230 │
│                                                                │
│  [New (12)]  [Modified (5)]  [Removed (3)]      ← Tabs       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ☑ Product A    SKU-001    ₩45,000                        │ │
│  │ ☑ Product B    SKU-002    ₩32,000                        │ │
│  │ ☐ Product C    SKU-003    ₩18,000                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Select All]  [Deselect All]    [Apply Selected (14)]        │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Product View Page (`/products`)

```
┌──────────────────────────────────────────────────────────────┐
│  {t('products.title')}                   [List] [Card]  🔍   │
│                                                                │
│  Filters: [Store ▼] [Vendor ▼] [Type ▼] [Stock ▼]  Sort: [▼] │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🖼 Air Max 90 - Black  │ AM90-BLK │ Nike │ Store A │ ₩129│ │
│  │ 🖼 Jordan 1 Retro      │ J1-WHT   │ Nike │ Store B │ ₩199│ │
│  │ 🖼 Dunk Low             │ DL-001   │ Nike │ Store A │ ₩109│ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Showing 1-20 of 245              [← 1 2 3 ... 13 →]         │
└──────────────────────────────────────────────────────────────┘
```

### 7.4 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ShopList` | `src/features/shops/components/ShopList.tsx` | Shop table with actions |
| `ShopForm` | `src/features/shops/components/ShopForm.tsx` | Create/Edit form (react-hook-form + zod) |
| `ShopDeleteDialog` | `src/features/shops/components/ShopDeleteDialog.tsx` | Confirmation modal |
| `SyncButton` | `src/features/shops/components/SyncButton.tsx` | Sync trigger with loading state |
| `DiffReview` | `src/features/shops/components/DiffReview.tsx` | Diff review container |
| `DiffSummary` | `src/features/shops/components/DiffSummary.tsx` | Summary badges (new/mod/rem) |
| `DiffTabs` | `src/features/shops/components/DiffTabs.tsx` | Tab navigation + content |
| `DiffItemRow` | `src/features/shops/components/DiffItemRow.tsx` | Individual item with checkbox |
| `FieldChanges` | `src/features/shops/components/FieldChanges.tsx` | old→new value display |
| `ProductList` | `src/features/products/components/ProductList.tsx` | Table view |
| `ProductCard` | `src/features/products/components/ProductCard.tsx` | Card view |
| `ProductGrid` | `src/features/products/components/ProductGrid.tsx` | Card grid layout |
| `ProductFilters` | `src/features/products/components/ProductFilters.tsx` | Filter dropdowns |
| `ProductSearch` | `src/features/products/components/ProductSearch.tsx` | Search input |
| `ViewToggle` | `src/features/products/components/ViewToggle.tsx` | List/Card switch |

---

## 8. File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout (sidebar + header)
│   │   ├── shops/
│   │   │   ├── page.tsx                  # Shop List page
│   │   │   ├── new/page.tsx              # Create Shop
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Shop detail
│   │   │       ├── edit/page.tsx         # Edit Shop
│   │   │       └── sync/page.tsx         # Diff Review page
│   │   └── products/
│   │       └── page.tsx                  # Product View page
│   └── api/
│       ├── shops/
│       │   ├── route.ts                  # GET (list), POST (create)
│       │   ├── sync-all/route.ts         # POST (sync all)
│       │   └── [id]/
│       │       ├── route.ts              # GET, PUT, DELETE
│       │       └── sync/
│       │           ├── route.ts          # POST (start sync)
│       │           ├── diff/route.ts     # GET (get diff)
│       │           ├── apply/route.ts    # POST (apply diff)
│       │           └── logs/route.ts     # GET (sync history)
│       ├── products/
│       │   └── route.ts                  # GET (query with filters)
│       └── product-groups/
│           └── route.ts                  # GET (groups list)
├── features/
│   ├── shops/
│   │   ├── components/                   # (see component list above)
│   │   ├── hooks/
│   │   │   ├── useShops.ts               # react-query: shop CRUD
│   │   │   ├── useSync.ts                # react-query: sync operations
│   │   │   └── useDiffReview.ts          # react-query: diff data + apply
│   │   ├── services/
│   │   │   ├── shopService.ts            # Shop CRUD logic
│   │   │   ├── syncService.ts            # Sync orchestration
│   │   │   ├── diff.ts                   # Diff generation logic
│   │   │   └── productGroupMapper.ts     # Auto-mapping logic
│   │   └── types/
│   │       └── index.ts                  # Shop, Sync, Diff types
│   └── products/
│       ├── components/                   # (see component list above)
│       ├── hooks/
│       │   └── useProducts.ts            # react-query: product queries
│       └── types/
│           └── index.ts                  # Product, Filter types
├── lib/
│   ├── prisma.ts                         # Prisma client singleton
│   └── shopify/
│       ├── client.ts                     # GraphQL client
│       └── transform.ts                  # Data transformation
├── messages/
│   ├── en/
│   │   ├── common.json                   # (from i18n feature)
│   │   ├── shops.json                    # Shop management translations
│   │   ├── sync.json                     # Sync/Diff translations
│   │   └── products.json                 # Product view translations
│   └── ko/
│       ├── common.json
│       ├── shops.json
│       ├── sync.json
│       └── products.json
└── prisma/
    ├── schema.prisma
    └── seed.ts                           # (optional) test data
```

---

## 9. Error Handling

### 9.1 API Error Format

```typescript
// src/lib/api/error.ts
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Standard error codes for Phase 0-1:
// SHOP_NOT_FOUND, SHOP_DOMAIN_EXISTS, SHOP_HAS_PRODUCTS
// SYNC_ALREADY_IN_PROGRESS, SYNC_NOT_IN_DIFF_REVIEW, SYNC_LOG_NOT_FOUND
// SHOPIFY_API_ERROR, SHOPIFY_RATE_LIMIT, SHOPIFY_AUTH_FAILED
// VALIDATION_ERROR
```

### 9.2 Shopify API Errors

| Error | Handling |
|-------|----------|
| 401 Unauthorized | Return `SHOPIFY_AUTH_FAILED`, suggest checking Access Token |
| 429 Rate Limited | Wait and retry (exponential backoff, max 3 retries) |
| 5xx Server Error | Mark SyncLog as FAILED, set ShopifyStore.syncStatus = FAILED |
| Network Error | Same as 5xx |

### 9.3 Sync Failure Recovery

```
If sync fails midway:
1. SyncLog.status = FAILED, SyncLog.error = error message
2. ShopifyStore.syncStatus = FAILED
3. No partial data committed (all within transaction)
4. User can retry sync → creates new SyncLog
```

---

## 10. Implementation Order

### Sprint 1: DB & Shop CRUD (Days 1-2)

1. [ ] **Prisma schema** — ShopifyStore, Product, ProductGroup, Vendor, SyncLog
2. [ ] **`npx prisma migrate dev`** — Run migration
3. [ ] **`src/lib/prisma.ts`** — Prisma client singleton
4. [ ] **Shop API routes** — `/api/shops` (GET, POST), `/api/shops/[id]` (GET, PUT, DELETE)
5. [ ] **Shop hooks** — `useShops.ts` (react-query)
6. [ ] **Shop List page** — Table with status, actions
7. [ ] **Shop Form** — Create/Edit with validation
8. [ ] **Shop Delete** — Confirmation dialog + soft delete

### Sprint 2: Shopify Sync Engine (Days 3-5)

9. [ ] **Shopify GraphQL client** — `src/lib/shopify/client.ts`
10. [ ] **Data transformer** — `src/lib/shopify/transform.ts`
11. [ ] **Initial Sync service** — Fetch → Vendor upsert → Product create → ProductGroup map
12. [ ] **barcodePrefix generator** — Unique prefix for each Product
13. [ ] **ProductGroup auto-mapper** — `src/features/shops/services/productGroupMapper.ts`
14. [ ] **Sync API route** — `POST /api/shops/[id]/sync`
15. [ ] **Re-sync diff generator** — `src/features/shops/services/diff.ts`
16. [ ] **Diff API** — `GET /api/shops/[id]/sync/diff`
17. [ ] **Diff Apply API** — `POST /api/shops/[id]/sync/apply`
18. [ ] **Diff Review page** — Summary + Tabs + Item selection
19. [ ] **Sync All API** — `POST /api/shops/sync-all`
20. [ ] **Sync Log API** — `GET /api/shops/[id]/sync/logs`
21. [ ] **SyncLog update** — Record results + timestamps

### Sprint 3: Product View (Days 6-7)

22. [ ] **Product query API** — `GET /api/products` with filters, search, sort, pagination
23. [ ] **Product groups API** — `GET /api/product-groups`
24. [ ] **ProductList component** — Table view
25. [ ] **ProductCard component** — Card view
26. [ ] **ViewToggle** — List/Card switch
27. [ ] **ProductFilters** — Dynamic multi-select dropdowns
28. [ ] **ProductSearch** — Debounced search input
29. [ ] **i18n translation files** — `shops.json`, `sync.json`, `products.json` (en + ko)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-06 | Initial design from Plan + original spec | BDJ Team |
