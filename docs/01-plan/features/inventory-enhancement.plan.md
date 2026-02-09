# Inventory Enhancement Planning Document

> **Summary**: Inventory 대시보드를 Products 수준으로 기능 강화 (검색/필터, 카드뷰, 상세패널, 바코드, 인쇄)
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-08
> **Status**: Draft
> **Depends On**: Phase0-2 (Inventory Registration) — completed, 99% match

---

## 1. Overview

### 1.1 Purpose

Phase 0-2에서 기본 재고 등록/조회 시스템을 구축했다. 그러나 현재 인벤토리 대시보드는 Products 페이지에 비해 기능이 부족하다:
- 테이블 뷰만 존재 (카드뷰 없음)
- 필터가 상태/위치만 지원 (상품/몰/벤더/정렬 없음)
- 클릭 시 상세 정보 확인 불가
- 인벤토리 아이템 바코드(BDJ-prefix-NNN)가 시각적으로 표시 안 됨
- 인쇄 기능 없음

### 1.2 Background

Products 페이지는 이미 뷰 토글, 고급 필터, 정렬, 상세 패널, 바코드 이미지 등을 갖추고 있다. 동일한 UX 패턴을 인벤토리에도 적용하여 일관성을 확보하고, 실무에서 필요한 기능(인쇄, 상세 조회)을 추가한다.

### 1.3 Related Documents

- Phase0-2 Plan: [Phase0-2.plan.md](Phase0-2.plan.md)
- Phase0-2 Design: [Phase0-2.design.md](../../02-design/features/Phase0-2.design.md)
- Products Enhancement: 기존 Products 페이지 패턴 참조

---

## 2. Scope

### 2.1 In Scope

- [x] FR-01: 고급 필터 추가 (상품, 몰, 벤더)
- [x] FR-02: 정렬 드롭다운 (이름, 바코드, 입고일, 상태)
- [x] FR-03: 카드뷰 + 뷰 토글 (리스트/카드 전환)
- [x] FR-04: 인벤토리 상세 패널 (클릭 시 슬라이드)
- [x] FR-05: 인벤토리 아이템 바코드 이미지 생성 (BDJ-prefix-NNN)
- [x] FR-06: 리스트/카드에서 인쇄 아이콘 (개별 라벨 인쇄)
- [x] FR-07: 상품 클릭 시 상품 상세 패널 (또는 상품 페이지 이동)
- [x] FR-08: 페이지네이션 개선 (숫자 버튼)
- [x] FR-09: 디버그 패널 제거 (임시 디버그 UI 정리)
- [x] FR-10: i18n 키 추가 (en/ko)

### 2.2 Out of Scope

- DB 스키마 변경 없음 (기존 Phase0-2 모델 그대로 사용)
- 인벤토리 CRUD (수정/삭제) — 향후 Phase
- 벌크 상태 변경 — 향후 Phase
- 재고 실사 워크플로우 — Phase 1+

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|:--------:|-------|
| FR-01 | 검색 컴포넌트 분리 + 디바운스 (300ms) | High | ProductSearch 패턴 |
| FR-02 | 필터: 상태, 위치(기존) + 상품, 몰(shopifyStore), 벤더 | High | API 이미 productId 지원 |
| FR-03 | 정렬: barcode, productName, receivedAt, status (asc/desc) | High | API 이미 sortBy 지원 |
| FR-04 | 뷰 토글: list / card | High | ViewToggle 재사용 |
| FR-05 | 인벤토리 카드 컴포넌트 (이미지, 바코드, 상태, 위치) | High | ProductCard 참조 |
| FR-06 | 인벤토리 상세 패널 (우측 슬라이드) | High | ProductDetailPanel 참조 |
| FR-07 | 바코드 이미지: `<Barcode>` 컴포넌트로 BDJ-prefix-NNN 표시 | High | JsBarcode CODE128 |
| FR-08 | 인쇄 아이콘: 리스트 행/카드에 프린터 아이콘, 클릭 시 라벨 인쇄 | Medium | LabelPrintView 재사용 |
| FR-09 | 상품 이름 클릭 → 상품 상세 패널 또는 `/products` 이동 | Medium | 패널 우선 |
| FR-10 | 숫자 페이지네이션 (최대 5개 표시) | Medium | Products 패턴 |
| FR-11 | i18n: 새 키 추가 (view, sort, detail, print 등) | High | en/ko |
| FR-12 | 임시 디버그 패널 제거 | High | 정리 |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 필터 변경 시 200ms 이내 API 응답 |
| UX 일관성 | Products 페이지와 동일한 디자인 토큰/패턴 |
| 반응형 | 모바일/태블릿/데스크톱 모두 대응 |

---

## 4. Technical Approach

### 4.1 API 변경

**기존 `GET /api/inventory` 확장** (DB 스키마 변경 없음):
- 추가 쿼리 파라미터: `shopifyStoreId`, `vendorId` (Product 관계를 통해 필터링)
- 응답에 필터 메타데이터 추가: stores, vendors (counts 포함)

### 4.2 컴포넌트 구조

```
src/features/inventory/components/
  ├── InventorySearch.tsx        (NEW — 디바운스 검색)
  ├── InventoryFilters.tsx       (NEW — 상태/위치/몰/벤더 필터)
  ├── InventorySortSelect.tsx    (NEW — 정렬 드롭다운)
  ├── InventoryCard.tsx          (NEW — 카드뷰 아이템)
  ├── InventoryGrid.tsx          (NEW — 카드 그리드 래퍼)
  ├── InventoryDetailPanel.tsx   (NEW — 상세 슬라이드 패널)
  ├── InventoryTable.tsx         (MODIFY — 바코드 이미지 + 인쇄 아이콘 + 클릭 핸들러)
  ├── InventoryStats.tsx         (기존 유지)
  ├── BarcodeScanner.tsx         (기존 유지)
  └── ...기타 register 컴포넌트 유지
```

### 4.3 Products 컴포넌트 재사용

| Component | 재사용 방식 |
|-----------|-------------|
| `ViewToggle` | 그대로 import (공통 컴포넌트) |
| `<Barcode>` | 그대로 import (`src/components/Barcode.tsx`) |
| `LabelPrintView` | 기존 인벤토리 컴포넌트 재사용 |
| `ProductDetailPanel` | 상품 클릭 시 재사용 |

### 4.4 상세 패널 동작

- **인벤토리 행/카드 클릭** → `InventoryDetailPanel` 표시:
  - 바코드 이미지 (큰 사이즈)
  - 상태, 컨디션, 위치, 입고일, 메모
  - 연결된 상품 정보 (이미지, 이름, SKU)
  - 상품 이름 클릭 → `ProductDetailPanel` 전환
- **상품 이름 클릭** (테이블/카드 내) → `ProductDetailPanel` 표시

---

## 5. Sprint Plan

### Sprint 1: API 확장 + 검색/필터/정렬 + 디버그 정리

| # | Task | Files |
|---|------|-------|
| 1 | 디버그 패널 제거 | `inventory/register/page.tsx` |
| 2 | API 확장: shopifyStoreId, vendorId 필터 + 필터 메타데이터 | `api/inventory/route.ts`, `types/index.ts` |
| 3 | InventorySearch 컴포넌트 (디바운스) | `components/InventorySearch.tsx` |
| 4 | InventoryFilters 컴포넌트 (상태, 위치, 몰, 벤더) | `components/InventoryFilters.tsx` |
| 5 | InventorySortSelect 컴포넌트 | `components/InventorySortSelect.tsx` |
| 6 | ViewToggle → 공통 컴포넌트로 이동 | `src/components/ViewToggle.tsx` |
| 7 | 인벤토리 페이지에 검색/필터/정렬/뷰토글 통합 | `inventory/page.tsx` |

### Sprint 2: 카드뷰 + 바코드 + 인쇄 + 페이지네이션

| # | Task | Files |
|---|------|-------|
| 1 | InventoryCard 컴포넌트 (바코드 이미지 포함) | `components/InventoryCard.tsx` |
| 2 | InventoryGrid 래퍼 | `components/InventoryGrid.tsx` |
| 3 | InventoryTable 수정: 바코드 이미지 + 인쇄 아이콘 + 행 클릭 | `components/InventoryTable.tsx` |
| 4 | 숫자 페이지네이션 | `inventory/page.tsx` |
| 5 | 인쇄 기능 (아이콘 클릭 → LabelPrintView) | 테이블/카드 통합 |

### Sprint 3: 상세 패널 + 상품 연동 + i18n

| # | Task | Files |
|---|------|-------|
| 1 | InventoryDetailPanel (슬라이드 패널) | `components/InventoryDetailPanel.tsx` |
| 2 | 상품 클릭 → ProductDetailPanel 표시 | `inventory/page.tsx` |
| 3 | i18n 키 추가 (en/ko) | `messages/{en,ko}/inventory.json` |
| 4 | 인벤토리 페이지 최종 통합 | `inventory/page.tsx` |

---

## 6. File Change Summary

| Type | Count | Files |
|------|:-----:|-------|
| NEW | 6 | InventorySearch, InventoryFilters, InventorySortSelect, InventoryCard, InventoryGrid, InventoryDetailPanel |
| MODIFY | 5 | inventory/page.tsx, InventoryTable.tsx, api/inventory/route.ts, types/index.ts, messages (en/ko) |
| MOVE | 1 | ViewToggle → src/components/ (공통화) |
| DELETE | 0 | — |
| **Total** | **12** | |

---

## 7. Success Criteria

- [ ] 모든 FR 구현 (12개)
- [ ] `npm run build` 성공
- [ ] Products 페이지와 동일한 UX 패턴
- [ ] 바코드 이미지(BDJ-prefix-NNN) 리스트/카드/상세에서 표시
- [ ] 인쇄 기능 동작 확인
- [ ] i18n (en/ko) 전체 키 커버
- [ ] 디버그 패널 제거

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API 확장 시 성능 저하 (join 증가) | 필터 메타데이터 쿼리 분리, 인덱스 활용 |
| ViewToggle 이동 시 Products 깨짐 | import 경로만 변경, 기능 동일 |
| 상세 패널 2종(인벤토리/상품) 충돌 | 하나만 표시, 상태로 관리 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-08 | Initial plan | BDJ Team |
