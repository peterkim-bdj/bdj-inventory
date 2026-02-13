# Inventory Grouped View Planning Document

> **Summary**: Inventory page redesign with product-grouped accordion table
>
> **Project**: BDJ Inventory
> **Version**: 0.1
> **Author**: Peter Kim
> **Date**: 2026-02-13
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 인벤토리 페이지는 개별 인벤토리 아이템을 flat list로 나열하고 있어, 같은 상품의 아이템들이 반복 표시되어 한눈에 재고 현황을 파악하기 어렵다. 상품별로 그룹핑된 accordion table을 도입하여, 상품 단위로 재고 수량/상태를 요약하고 필요시 펼쳐서 개별 아이템을 확인할 수 있도록 개선한다.

### 1.2 Background

- 인벤토리 수가 늘어나면서 같은 상품명이 반복 표시되어 시각적 노이즈 발생
- 상품별 재고 현황(몇 개 Available, Reserved 등)을 빠르게 파악할 수 없음
- 디렉토리/트리 구조처럼 상품 > 인벤토리 아이템의 계층적 뷰 필요
- 기존 List/Card 뷰는 유지하되 새로운 "Grouped" 뷰를 기본값으로 추가

### 1.3 Related Documents

- Design: `docs/02-design/features/inventory-grouped-view.design.md` (TBD)
- Existing: `docs/01-plan/features/inventory-enhancement.plan.md` (archived)

---

## 2. Scope

### 2.1 In Scope

- [x] 새로운 "Grouped" 뷰 모드 (List | Grouped | Card 3-way toggle)
- [x] 상품별 그룹핑 API 엔드포인트 (`/api/inventory/grouped`)
- [x] 상품 행: 이미지, 이름+variant, 재고 수, 상태별 요약 도트/뱃지
- [x] 펼치기/접기 (accordion): 클릭 시 해당 상품의 인벤토리 아이템 표시
- [x] 펼친 아이템 행: 바코드, 위치, 상태, 컨디션, 날짜, 프린트 버튼
- [x] 기존 필터/검색/정렬과 호환
- [x] 기존 List/Card 뷰 유지
- [x] i18n (EN/KO)

### 2.2 Out of Scope

- 드래그 앤 드롭으로 인벤토리 아이템 재배치
- 상품 간 인벤토리 이동
- 인라인 편집 (상태 변경 등)
- 무한 스크롤 (현재 pagination 유지)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 상품별 그룹핑 API: productId로 group by, 각 상품의 인벤토리 수/상태 카운트 반환 | High | Pending |
| FR-02 | Grouped 뷰 모드: ViewToggle에 "Grouped" 옵션 추가 (아이콘: layers/tree) | High | Pending |
| FR-03 | Product Row (접힌 상태): 이미지 + 이름 + variantTitle + 재고 수 + 상태 미니 도트 | High | Pending |
| FR-04 | Product Row 펼치기: 클릭 시 하위 인벤토리 아이템 행들이 아코디언으로 표시 | High | Pending |
| FR-05 | Item Row (펼친 상태): 바코드, 위치, 상태 뱃지, 컨디션, 날짜, 프린트 버튼 | High | Pending |
| FR-06 | 펼친 아이템 클릭 시 기존 InventoryDetailPanel 표시 | Medium | Pending |
| FR-07 | 기존 필터(상태/위치/스토어/벤더)와 검색이 Grouped 뷰에서도 동작 | High | Pending |
| FR-08 | Grouped 뷰 기본 정렬: 재고 수 내림차순 (가장 많은 상품 먼저) | Medium | Pending |
| FR-09 | i18n: Grouped 뷰 관련 번역키 추가 (EN/KO) | Medium | Pending |
| FR-10 | Grouped가 기본 뷰, List/Card도 유지 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 그룹핑 API 응답 < 500ms (1000 아이템 기준) | 브라우저 Network 탭 |
| UX | 펼치기/접기 애니메이션 smooth (200ms) | 시각적 확인 |
| Responsiveness | 모바일에서 Grouped 뷰 사용 가능 | 브라우저 반응형 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] Grouped 뷰 모드에서 상품별 재고 수 한눈에 확인 가능
- [x] 상품 클릭 시 하위 인벤토리 아이템 표시
- [x] 기존 필터/검색이 Grouped 뷰에서 정상 동작
- [x] List/Card 뷰 기존 기능 유지
- [x] i18n EN/KO 번역 완료

### 4.2 Quality Criteria

- [x] TypeScript 에러 없음
- [x] 빌드 성공
- [x] 다크 모드 정상

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 대량 상품 그룹핑 시 DB 성능 | Medium | Low | groupBy 쿼리 최적화, 페이지네이션 유지 |
| 펼침 상태에서 많은 아이템 렌더링 | Low | Medium | 펼친 아이템도 최대 50개 제한, "더보기" 링크 |
| 기존 필터와 Grouped 뷰 호환 | Medium | Low | 필터를 상품 레벨과 아이템 레벨 모두에 적용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules | Web apps with backend | **X** |
| **Enterprise** | Strict layer separation | Complex architectures | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 그룹핑 방식 | 프론트엔드 그룹핑 / 백엔드 API | 백엔드 API | 대량 데이터 시 프론트엔드 그룹핑은 비효율적 |
| 아코디언 상태 관리 | useState / Zustand | useState | 컴포넌트 로컬 상태로 충분 |
| 펼친 아이템 로딩 | 초기 일괄 로드 / 펼칠 때 lazy load | Lazy load | 초기 로딩 최소화, 필요시에만 상세 데이터 가져오기 |
| 뷰 토글 | 2-way → 3-way | 3-way (List/Grouped/Card) | 기존 뷰 유지하면서 새 뷰 추가 |

### 6.3 데이터 구조 설계

```typescript
// API Response: /api/inventory/grouped
interface GroupedInventoryResponse {
  groups: ProductInventoryGroup[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: InventoryStats;
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
  statusCounts: Record<string, number>;  // { AVAILABLE: 3, SOLD: 1, ... }
  items?: InventoryItemDetail[];  // lazy loaded on expand
}
```

### 6.4 UI 구조

```
┌──────────────────────────────────────────────────────────────────────┐
│ Inventory  12 items                    [List] [Grouped] [Card]      │
│                                                                      │
│ ┌─ Stats ──────────────────────────────────────────────────────────┐ │
│ │  8 Available  │  2 Reserved  │  1 Sold  │  1 Damaged            │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [Search...] [Status v] [Location v] [Store v] [Vendor v] [Sort v]  │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ PRODUCT                              │ QTY │ STATUS             │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ ▶ 🖼 AIR FAN Cooler Vest — White/M   │  5  │ ●3 ●1 ●1          │ │
│ │ ▼ 🖼 AIR FAN Cooler Vest — White/L   │  3  │ ●3                │ │
│ │   ├ BDJ-KW7GYK-001  Basement(B1)  Available  New  2/13  🖨     │ │
│ │   ├ BDJ-KW7GYK-002  Basement(B1)  Available  New  2/13  🖨     │ │
│ │   └ BDJ-KW7GYK-003  Storage(S2)   Available  New  2/13  🖨     │ │
│ │ ▶ 🖼 Maje Tweed Jacket — Gray/S     │  2  │ ●1 ●1             │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] Feature-based module structure (`src/features/inventory/`)
- [x] React Query for data fetching
- [x] next-intl for i18n
- [x] shadcn/ui + Tailwind CSS
- [x] Prisma ORM

### 7.2 New Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/inventory/grouped/route.ts` | Grouped inventory API |
| `src/features/inventory/components/InventoryGroupedTable.tsx` | Grouped accordion table |
| `src/features/inventory/components/ProductGroupRow.tsx` | Product summary row |
| `src/features/inventory/components/ExpandedItemRow.tsx` | Expanded item sub-row |
| `src/features/inventory/hooks/useGroupedInventory.ts` | React Query hook for grouped API |

### 7.3 Files to Modify

| File | Changes |
|------|---------|
| `src/components/ViewToggle.tsx` | Add 'grouped' mode option |
| `src/app/(dashboard)/inventory/page.tsx` | Add Grouped view rendering |
| `src/features/inventory/types/index.ts` | Add grouped types |
| `src/messages/en/inventory.json` | Add grouped view translations |
| `src/messages/ko/inventory.json` | Add grouped view translations |

---

## 8. Next Steps

1. [x] Plan document approval
2. [ ] Write design document (`inventory-grouped-view.design.md`)
3. [ ] Implementation
4. [ ] Gap analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial draft | Peter Kim |
