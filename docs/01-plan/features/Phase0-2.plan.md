# Phase 0-2: Inventory Registration Plan

> **Status**: Draft
>
> **Project**: BDJ Inventory
> **Feature**: Phase0-2 (Inventory Registration)
> **Author**: BDJ Team
> **Created**: 2026-02-07
> **Reference**: [Phase 0-2 Inventory 초기 데이터 구축](../../Phase%200-2.%20Inventory%20초기%20데이터%20구축%20-%20BDJ%20Inventory.md)

---

## 1. Overview

Phase 0-1에서 Shopify 상품 데이터를 DB에 구축했다. Phase 0-2에서는 **실제 창고에 있는 재고**를 시스템에 등록한다.

핵심 기능은 **바코드 스캔 등록** (시스템 내장, 운영 전반에서 지속 사용).
보조 방법인 사진 기반 일괄 등록은 외부 도구(Claude Code)이므로 이 Phase의 시스템 구현 범위에서 제외한다.

---

## 2. Goals

1. **DB 스키마 확장**: Location(창고 위치) + InventoryItem(개별 재고) 모델 추가
2. **바코드 스캔 → 상품 검색 → 수량/위치 입력 → 개별 아이템 생성** 플로우 구현
3. **개별 바코드 발급 + 라벨 출력** 기능 구현
4. **재고 현황 대시보드**: 상품별/위치별 재고 수량 조회
5. **모바일 대응**: 카메라 바코드 스캔 (BarcodeDetector API / html5-qrcode)
6. **네비게이션 추가**: /inventory 페이지

---

## 3. Scope

### In Scope (이번 Phase)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Location 스키마 + 시드 | Location 테이블 (계층 구조), 초기 데이터: 1층(F1), 지하(B1) |
| 2 | InventoryItem 스키마 | 개별 아이템 추적, 바코드, 상태, 위치, 컨디션 |
| 3 | Product 관계 추가 | Product ↔ InventoryItem 관계 추가 |
| 4 | 바코드 스캔 → 상품 검색 API | shopifyBarcode → SKU → name 우선순위로 매칭 |
| 5 | 재고 등록 API | 수량만큼 InventoryItem 생성 + 개별 바코드 발급 |
| 6 | 바코드 라벨 출력 | {barcodePrefix}-{sequence} 포맷, 프린트 가능 레이아웃 |
| 7 | 재고 등록 UI (데스크톱) | 스캔 입력 → 상품 정보 → 수량/위치 → 등록 |
| 8 | 재고 등록 UI (모바일) | 카메라 뷰 + 간소화 UI, 연속 스캔 |
| 9 | 재고 현황 페이지 | 상품별 재고 수량, 위치별 현황, 필터/검색 |
| 10 | 최근 등록 내역 | 직전 등록 이력 표시 (연속 작업 확인용) |
| 11 | 신규 상품 생성 | 매칭 안 된 바코드 → 최소 정보로 Product 생성 (shopifySynced: false) |
| 12 | i18n | 모든 UI 텍스트 en/ko 지원 |

### Out of Scope (향후)

- 사진 기반 일괄 등록 (외부 도구, Phase 0-2 시스템 범위 밖)
- BulkInventory (수량 기반 추적 - 향후 확장)
- InventoryAuditLog (변경 이력 - Phase 1+)
- 재고 실사 워크플로우
- Shopify 웹훅 연동 (Phase 1)
- 주문 처리 워크플로우 (Phase 2)

---

## 4. Data Model Changes

### New Models

#### Location
```
- id, name, code(unique), parentId(self-ref), level, description, isActive
- 계층 구조: 건물(0) → 층(1) → 구역(2) → 선반(3)
- 초기 시드: 1층(F1, level=1), 지하(B1, level=1)
```

#### InventoryItem
```
- id, barcode(unique), productId, locationId, status, condition, notes, receivedAt, soldAt
- status: AVAILABLE | RESERVED | SOLD | RETURNED | DAMAGED
- condition: NEW | LIKE_NEW | GOOD | FAIR | POOR
- 바코드 형식: {product.barcodePrefix}-{3자리 시퀀스} (예: BDJ-A1B2C3-001)
```

### Modified Models

#### Product
```
- items: InventoryItem[] 관계 추가
- shopifySynced 인덱스 추가: @@index([shopifySynced])
```

---

## 5. Sprint Plan

### Sprint 1: DB + API Foundation
- Location, InventoryItem 스키마 + 마이그레이션
- Location 시드 데이터 (1층, 지하)
- Location CRUD API
- 바코드 스캔 → 상품 검색 API (`GET /api/inventory/scan?barcode=...`)
- 재고 등록 API (`POST /api/inventory/register`)
- 신규 상품 생성 API (매칭 안 될 때)

### Sprint 2: 재고 등록 UI
- 데스크톱 재고 등록 페이지 (`/inventory/register`)
- 바코드 입력 (스캐너/수동) → 상품 매칭 → 수량/위치 → 등록
- 최근 등록 내역 표시
- 바코드 라벨 출력 (인쇄용 레이아웃)
- 모바일 카메라 스캔 (BarcodeDetector API + html5-qrcode 폴백)
- 모바일 간소화 UI (카메라 + 수량 + 위치)

### Sprint 3: 재고 현황 + 네비게이션
- 재고 현황 페이지 (`/inventory`)
- 상품별 재고 수량 집계
- 위치별 현황
- 필터: 상태(AVAILABLE 등), 위치, 상품 검색
- 네비게이션에 "재고" 메뉴 추가
- i18n (en/ko) 모든 키 추가

---

## 6. Technical Approach

### Barcode Scanning
- **USB/Bluetooth 스캐너**: input 필드에 자동 입력 (키보드 에뮬레이션)
- **모바일 카메라**: `BarcodeDetector` API (Chrome 83+) → 폴백: `html5-qrcode` 라이브러리
- **수동 입력**: 텍스트 필드

### Barcode Generation
- 개별 아이템 바코드: `{product.barcodePrefix}-{NNN}` (001부터 순차)
- 시퀀스는 해당 Product의 기존 InventoryItem 개수 기반

### Search Priority (스캔 시)
1. `shopifyBarcode` 정확 매칭
2. `sku` 정확 매칭
3. `name` 부분 매칭 (contains, insensitive)

### Label Printing
- 브라우저 `window.print()` + `@media print` CSS
- 라벨 크기: 일반 라벨 프린터 호환 (50mm x 25mm 등)

---

## 7. Dependencies

- `html5-qrcode`: 모바일 카메라 바코드 스캔 폴백 라이브러리
- Prisma migration: Location + InventoryItem + enums 추가

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| BarcodeDetector API 지원 불안정 | html5-qrcode 폴백 라이브러리 사용 |
| 모바일 카메라 권한 거부 | 수동 입력 폴백 제공 |
| 대량 등록 시 성능 | 배치 처리 (한 번에 최대 100개) |
| 바코드 중복 | DB unique 제약 + 시퀀스 기반 생성 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-07 | Initial plan | BDJ Team |
