# Inventory Grouped View Design Document

> **Summary**: Product-grouped accordion table for inventory page
>
> **Project**: BDJ Inventory
> **Version**: 0.1
> **Author**: Peter Kim
> **Date**: 2026-02-13
> **Status**: Draft
> **Planning Doc**: [inventory-grouped-view.plan.md](../../01-plan/features/inventory-grouped-view.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 상품별 인벤토리 그룹핑으로 한눈에 재고 현황 파악
- 펼치기/접기 아코디언으로 상세 아이템 확인
- 기존 List/Card 뷰와 공존하는 3-way 토글
- 기존 필터/검색/정렬 시스템과 완전 호환
- 최소한의 코드 변경으로 기존 아키텍처에 통합

### 1.2 Design Principles

- **Lazy Loading**: 펼칠 때만 개별 아이템 로드 (초기 로딩 최소화)
- **Reuse**: 기존 InventoryDetailPanel, LabelPrintView 재사용
- **Consistent**: 기존 UI 패턴 (rounded-xl, dark mode, Tailwind) 유지

---

## 2. Architecture

### 2.1 Component Diagram

```
InventoryPage
├── ViewToggle (list | grouped | card)  ← 3-way 확장
├── InventoryStats (기존 유지)
├── InventoryFilters + SmartSearchInput (기존 유지)
│
├── [view=list] → InventoryTable (기존)
├── [view=card] → InventoryGrid (기존)
└── [view=grouped] → InventoryGroupedTable (신규)
                       ├── ProductGroupRow (접힌 상태)
                       │   ├── 상품 이미지 + 이름 + variant
                       │   ├── 재고 수 뱃지
                       │   └── 상태별 도트 요약
                       └── [expanded] → ExpandedItemRows
                           ├── 바코드 + 위치 + 상태 + 컨디션
                           └── 날짜 + 프린트 버튼
```

### 2.2 Data Flow

```
1. InventoryPage: view='grouped' 선택
2. useGroupedInventory(filters) → GET /api/inventory/grouped
3. API: Prisma groupBy productId → 상품별 카운트/상태 집계
4. 렌더링: ProductGroupRow × N
5. 사용자 클릭 → expandedIds에 productId 추가
6. useInventory({ productId }) → GET /api/inventory?productId=xxx
7. 렌더링: ExpandedItemRow × M (해당 상품의 아이템들)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| InventoryGroupedTable | useGroupedInventory | 그룹 데이터 페칭 |
| InventoryGroupedTable | useInventory (기존) | 펼친 아이템 페칭 |
| ProductGroupRow | 없음 (presentational) | 상품 행 렌더링 |
| ViewToggle | 없음 | 3-way 뷰 전환 |

---

## 3. Data Model

### 3.1 API Response Types

```typescript
// 그룹핑 API 응답
interface GroupedInventoryResponse {
  groups: ProductInventoryGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;       // 그룹(상품) 수
    totalPages: number;
    totalItems: number;  // 전체 인벤토리 아이템 수
  };
  stats: {
    byStatus: Array<{ status: string; count: number }>;
    total: number;
  };
  filters: InventoryFiltersMeta;
}

interface ProductInventoryGroup {
  product: {
    id: string;
    name: string;
    variantTitle: string | null;
    sku: string | null;
    imageUrl: string | null;
    shopifyStoreId: string | null;
    vendorName: string | null;
  };
  totalCount: number;
  statusCounts: {
    AVAILABLE?: number;
    RESERVED?: number;
    SOLD?: number;
    RETURNED?: number;
    DAMAGED?: number;
  };
}
```

### 3.2 ViewToggle Type Update

```typescript
// 기존: 'list' | 'card'
// 변경: 'list' | 'grouped' | 'card'
type InventoryViewMode = 'list' | 'grouped' | 'card';
```

---

## 4. API Specification

### 4.1 Endpoint

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/inventory/grouped` | 상품별 그룹핑된 인벤토리 목록 | Required |

### 4.2 `GET /api/inventory/grouped`

**Query Parameters** (기존 inventory API와 동일한 필터):

| Param | Type | Description |
|-------|------|-------------|
| search | string | 상품명/SKU/바코드 검색 |
| status | string | 인벤토리 상태 필터 |
| locationId | string | 위치 필터 |
| shopifyStoreId | string | 스토어 필터 |
| vendorId | string | 벤더 필터 |
| sortBy | string | `totalCount` \| `productName` (기본: totalCount) |
| sortOrder | string | `asc` \| `desc` (기본: desc) |
| page | number | 페이지 (기본: 1) |
| limit | number | 페이지당 상품 수 (기본: 20) |

**Response (200):**
```json
{
  "groups": [
    {
      "product": {
        "id": "prod_123",
        "name": "[AIR FAN] Men's Cooler Vest",
        "variantTitle": "White / M",
        "sku": "AGEMMVT03WH",
        "imageUrl": "https://...",
        "shopifyStoreId": "store_1",
        "vendorName": "AIR FAN"
      },
      "totalCount": 5,
      "statusCounts": { "AVAILABLE": 3, "RESERVED": 1, "SOLD": 1 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1, "totalItems": 42 },
  "stats": { "byStatus": [...], "total": 42 },
  "filters": { "stores": [...], "vendors": [...] }
}
```

### 4.3 Prisma Query Strategy

```typescript
// 1단계: 필터 조건에 맞는 상품 ID + 카운트 집계
const grouped = await prisma.inventoryItem.groupBy({
  by: ['productId'],
  where: whereClause,
  _count: true,
  orderBy: { _count: { productId: 'desc' } },
  skip: (page - 1) * limit,
  take: limit,
});

// 2단계: 해당 상품 정보 조회
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
  select: { id, name, variantTitle, sku, imageUrl, ... },
});

// 3단계: 상태별 카운트 (각 상품별)
const statusCounts = await prisma.inventoryItem.groupBy({
  by: ['productId', 'status'],
  where: { productId: { in: productIds }, ...whereClause },
  _count: true,
});
```

---

## 5. UI/UX Design

### 5.1 Screen Layout (Grouped View)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Inventory  42 items                [List] [Grouped*] [Card]  [Register] │
│                                                                          │
│ ┌── Stats ────────────────────────────────────────────────────────────┐  │
│ │ 28 Available │ 8 Reserved │ 4 Sold │ 2 Damaged                     │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ [🔍 Search...]  [Status ▾]  [Location ▾]  [Store ▾]  [Vendor ▾]        │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐  │
│ │ PRODUCT                                   │  QTY  │  STATUS        │  │
│ ├─────────────────────────────────────────────────────────────────────┤  │
│ │ ▶ 🖼 AIR FAN Cooler Vest — White / M      │   5   │ ●3 ●1 ●1     │  │
│ │ ▼ 🖼 AIR FAN Cooler Vest — White / L      │   3   │ ●3            │  │
│ │   ┊ BDJ-KW7GYK-001  Basement(B1)  ▪Avail  New   2/13  🖨         │  │
│ │   ┊ BDJ-KW7GYK-002  Basement(B1)  ▪Avail  New   2/13  🖨         │  │
│ │   ┊ BDJ-KW7GYK-003  Storage(S2)   ▪Avail  Good  2/12  🖨         │  │
│ │ ▶ 🖼 Maje Tweed Jacket — Gray / S         │   2   │ ●1 ●1        │  │
│ │ ▶ 🖼 Sokimnewyork Blazer                  │   1   │ ●1            │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                    ◀ 1 2 3 ▶   Showing 1-15 of 15 products              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 ProductGroupRow (접힌 상태) Detail

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▶  🖼  [AIR FAN] Men's Cooler Vest — White / M    │  5  │ ●3 ●1 ●1│
│  chevron img  name + variant                       │count│ dots     │
│    12px  32px  truncate max-w-[300px]              │badge│ colors   │
└──────────────────────────────────────────────────────────────────────┘

Status Dots:
  ● green  = AVAILABLE
  ● yellow = RESERVED
  ● gray   = SOLD
  ● blue   = RETURNED
  ● red    = DAMAGED
  숫자 + 도트 (e.g., "3●" "1●" "1●")
```

### 5.3 ExpandedItemRow (펼친 상태) Detail

```
│   ┊ |||||||||||||||||||  Basement (B1)  ▪Available  New   2/13/2026  🖨 │
│     barcode(small)       location        status     cond  date      print│
│     font-mono text-xs    text-xs         badge      xs    xs             │
│     bg-gray-50 indent    gray-500                                        │
```

### 5.4 User Flow

```
1. 인벤토리 페이지 진입 → Grouped 뷰 기본 표시
2. 상품 목록 (그룹별 요약) 확인
3. 관심 상품 행 클릭 → 아코디언 펼침 (해당 상품의 아이템 로드)
4. 개별 아이템 클릭 → InventoryDetailPanel 열림
5. 다시 상품 행 클릭 → 아코디언 접힘
6. 필터/검색 → 그룹 목록 업데이트
7. List/Card 뷰 전환 → 기존 동작 그대로
```

### 5.5 Component Specification

| Component | File | Responsibility |
|-----------|------|----------------|
| `InventoryGroupedTable` | `src/features/inventory/components/InventoryGroupedTable.tsx` | 그룹 테이블 전체 컨테이너, expanded 상태 관리 |
| `ProductGroupRow` | 같은 파일 내 서브컴포넌트 | 상품 행 렌더링 (이미지, 이름, 카운트, 상태 도트) |
| `ExpandedItemRows` | 같은 파일 내 서브컴포넌트 | 펼쳐진 아이템 목록 (useInventory로 lazy load) |
| `ViewToggle` | `src/components/ViewToggle.tsx` | 3-way 토글로 확장 |
| `useGroupedInventory` | `src/features/inventory/hooks/useGroupedInventory.ts` | 그룹 API 호출 React Query hook |

---

## 6. Error Handling

| Scenario | Handling |
|----------|----------|
| 그룹 API 실패 | 에러 메시지 표시, 재시도 가능 |
| 펼침 시 아이템 로드 실패 | 해당 행에 인라인 에러, "다시 시도" 버튼 |
| 빈 결과 (필터 후 그룹 없음) | 기존 noItems 메시지 + Register 버튼 |
| 펼친 상품에 아이템 0개 | (발생 불가 - 그룹핑은 아이템이 있는 상품만) |

---

## 7. Implementation Guide

### 7.1 File Structure

```
src/
├── components/
│   └── ViewToggle.tsx                      ← 수정: 3-way 지원
├── features/inventory/
│   ├── types/index.ts                      ← 수정: GroupedInventory 타입 추가
│   ├── hooks/
│   │   ├── useInventory.ts                 ← 기존 유지 (펼침용으로 재사용)
│   │   └── useGroupedInventory.ts          ← 신규
│   └── components/
│       ├── InventoryGroupedTable.tsx        ← 신규 (메인 + 서브 컴포넌트)
│       ├── InventoryTable.tsx              ← 기존 유지
│       └── InventoryCard.tsx               ← 기존 유지
├── app/
│   ├── api/inventory/
│   │   ├── route.ts                        ← 기존 유지
│   │   └── grouped/route.ts               ← 신규 API
│   └── (dashboard)/inventory/
│       └── page.tsx                        ← 수정: grouped 뷰 추가
└── messages/
    ├── en/inventory.json                   ← 수정: grouped 번역 추가
    └── ko/inventory.json                   ← 수정: grouped 번역 추가
```

### 7.2 Implementation Order

1. [ ] **Types**: `ProductInventoryGroup`, `GroupedInventoryResponse` 타입 추가
2. [ ] **API**: `/api/inventory/grouped` route 구현
3. [ ] **Hook**: `useGroupedInventory` React Query hook 작성
4. [ ] **ViewToggle**: 3-way 토글로 확장 (`list | grouped | card`)
5. [ ] **InventoryGroupedTable**: 메인 컴포넌트 (ProductGroupRow + ExpandedItemRows)
6. [ ] **Page Integration**: inventory page에 grouped 뷰 연결
7. [ ] **i18n**: EN/KO 번역키 추가
8. [ ] **Testing & Polish**: 다크 모드, 반응형, 에지 케이스

### 7.3 i18n Keys to Add

```json
// inventory namespace
{
  "view.grouped": "Grouped" / "그룹",
  "grouped.product": "Product" / "상품",
  "grouped.qty": "Qty" / "수량",
  "grouped.statusSummary": "Status" / "상태",
  "grouped.expand": "Expand" / "펼치기",
  "grouped.collapse": "Collapse" / "접기",
  "grouped.loadingItems": "Loading items..." / "아이템 로딩 중...",
  "grouped.productCount": "{count} products" / "{count}개 상품"
}
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Peter Kim |
