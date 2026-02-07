---
created: 2026-02-04
tags:
  - BDJ-Inventory
  - Shopify
  - Database
  - Phase0
  - Data-Migration
source_url:
source_type: Other
channel: "[[BDJ Inventory]]"
status: Summarized
---

# Phase 0-1: Shop 관리 & Product 초기 데이터 구축 - BDJ Inventory

> [!tldr] 💡 핵심 한 줄
> Shop CRUD로 Shopify 몰을 유연하게 추가/관리하고, Sync 기능으로 상품 데이터를 가져오되, 재동기화 시 Diff Review로 변경사항을 사용자가 확인 후 반영한다.
>
> Manage Shopify stores flexibly via Shop CRUD, import product data through Sync, and on re-sync show a Diff Review so users can confirm changes before applying.

## 핵심 요약

Phase 0-1은 BDJ Inventory 시스템의 **데이터 기반**을 구축하는 단계다. 기존 "4개 몰 일괄 Import 스크립트" 방식에서 **Shop CRUD + 개별/전체 Sync** 방식으로 변경하여, 몰을 하나씩 추가하고 각각 동기화할 수 있다. 재동기화 시에는 **Diff Review**를 통해 변경사항(신규/수정/삭제)을 사용자가 확인 후 반영한다. 이후 Product View UI를 통해 데이터 검증과 상품 관리가 가능하다.

## 주요 내용

### 1. Shop 관리 (CRUD)

Shopify 몰을 시스템에 등록하고 관리하는 기능. 처음부터 4개를 한꺼번에 등록할 필요 없이, **하나씩 추가하면서 단계적으로 구축**할 수 있다.

#### Shop List UI

| 컬럼 | 설명 |
|------|------|
| 이름 | Shop 표시명 (예: "Store A") |
| 도메인 | Shopify 도메인 |
| 상품 수 | 동기화된 Product 수 |
| 마지막 동기화 | 최근 Sync 시각 (미동기화 시 "—") |
| 상태 | 미동기화 / 동기화 완료 / 동기화 중 / Diff 확인 대기 / 실패 |
| 액션 | \[동기화\] \[수정\] \[삭제\] |

```
┌──────────────────────────────────────────────────────────────────────┐
│  Shop 관리                                          [+ Shop 추가]   │
│                                                                      │
│  이름       도메인                    상품 수  마지막 동기화    상태         액션          │
│  ─────────────────────────────────────────────────────────────────── │
│  Store A   store-a.myshopify.com    245    2026-02-05 14:30  ✅ 동기화 완료  [Sync][수정][삭제] │
│  Store B   store-b.myshopify.com    180    2026-02-04 09:15  ✅ 동기화 완료  [Sync][수정][삭제] │
│  Store C   store-c.myshopify.com     —         —             ⬜ 미동기화    [Sync][수정][삭제] │
│                                                                      │
│                                  [전체 동기화]                        │
└──────────────────────────────────────────────────────────────────────┘
```

#### Shop 추가 (Create)

- **필수 입력**: 이름, Shopify 도메인 (`xxx.myshopify.com`), Access Token
- **선택 입력**: API 버전 (기본값 `"2025-01"`)
- 저장 후 Shop List에 **"미동기화"** 상태로 표시
- 추가 직후 첫 동기화 실행을 유도 (버튼 또는 안내 메시지)

#### Shop 수정 (Update)

- 이름, Access Token, API 버전 수정 가능
- 도메인 변경 시 경고: "연결된 상품 데이터에 영향을 줄 수 있습니다"

#### Shop 삭제 (Delete)

- 연결된 Product가 있으면 확인 모달 표시:
  > "이 몰에 연결된 상품 N개도 함께 비활성화됩니다. 계속하시겠습니까?"
- **Soft Delete**: `isActive = false` 처리
- 관련 Product → `shopifySynced = false` 처리
- ProductGroup 내 해당 Product 연결은 유지 (비활성 상태로)
- 나중에 재활성화 가능

---

### 2. Sync 기능

Shop의 Shopify 상품 데이터를 BDJ DB로 가져오는 기능. **개별 또는 전체** 동기화를 지원하며, 이미 데이터가 있는 경우 **Diff Review**로 변경사항을 확인한다.

#### 동기화 범위

| 유형 | 설명 |
|------|------|
| **개별 Sync** | 특정 몰 하나만 동기화 |
| **전체 Sync** | 모든 활성 몰을 순차적으로 동기화 |

#### 첫 동기화 (Initial Sync)

새로 추가된 Shop의 첫 동기화. 기존 데이터가 없으므로 모든 Active 상품을 바로 Import한다.

| Step | 작업 | 설명 |
|------|------|------|
| 1 | Shopify GraphQL API → Products Fetch | Pagination으로 전체 Active 상품 |
| 2 | Vendor 이름 추출 | Set으로 중복 제거 |
| 3 | Vendor Upsert | 이름만 저장 (연락처는 나중에 수동 입력) |
| 4 | Product 생성 | vendorId, shopifyStoreId 연결 |
| 5 | ProductGroup 자동 매핑 | SKU/바코드 기준 크로스 스토어 그룹 생성 |
| 6 | 결과 요약 표시 | "상품 N개, 벤더 M개 추가 완료" |

> [!tip] 첫 동기화는 Diff Review 없이 바로 반영
> 기존 데이터가 없으므로 비교할 대상이 없다. 모든 상품을 즉시 Import하고 결과를 요약으로 표시한다.

#### 재동기화 (Re-Sync with Diff Review)

이미 데이터가 있는 Shop의 재동기화. Shopify 현재 상태와 DB를 비교하여 **Diff를 생성**하고, 사용자가 확인 후 반영한다.

**프로세스 흐름**:
```
[Sync 시작] → [Shopify API Fetch] → [DB와 비교] → [Diff 생성]
    → [Diff Review UI] → [사용자 확인/선택] → [선택 항목 반영] → [완료]
```

| Step | 작업 | 설명 |
|------|------|------|
| 1 | Shopify API → 현재 Active 상품 Fetch | Pagination으로 전체 |
| 2 | 기존 DB 데이터와 비교 | Diff 생성 |
| 3 | Diff Review UI 표시 | 사용자 확인 대기 |
| 4 | 사용자가 항목별 승인/거부 선택 | |
| 5 | 승인된 항목만 DB 반영 | |
| 6 | ProductGroup 재매핑 | 변경된 상품 대상 |
| 7 | SyncLog 기록 | |

##### Diff 유형

| 유형 | 조건 | 기본 액션 | 사용자 선택 |
|------|------|----------|-----------|
| **🟢 신규 (NEW)** | Shopify에 있는데 DB에 없음 | 추가 | ✅ 추가 / ❌ 무시 |
| **🟡 변경 (MODIFIED)** | 양쪽에 있지만 데이터 다름 | Shopify 기준 업데이트 | ✅ 업데이트 / ❌ 기존 유지 |
| **🔴 삭제 (REMOVED)** | DB에 있는데 Shopify에 없음 | 유지 (안전) | ✅ 유지 / ❌ 비활성화 |
| **⚪ 동일 (UNCHANGED)** | 변경 없음 | — | (표시 안 함) |

> [!important] 기본 액션 = 안전 우선
> - 신규: 추가 (새 상품이므로 안전)
> - 변경: Shopify 기준 업데이트 (Shopify가 원본 소스)
> - 삭제: **유지** (실수로 Shopify에서 삭제했을 수 있으므로 기본은 보존)

##### 비교 대상 필드

| 필드 | 비교 방식 |
|------|----------|
| name | 텍스트 비교 |
| description | 텍스트 비교 |
| sku | 정확 매칭 |
| shopifyBarcode | 정확 매칭 |
| productType | 텍스트 비교 |
| price | 숫자 비교 |
| compareAtPrice | 숫자 비교 |
| imageUrl | URL 비교 |
| vendorName | 텍스트 비교 |
| Shopify 상태 | Active / Draft / Archived |

##### Diff Review UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Store A — 재동기화 결과                                         │
│                                                                  │
│  요약: 🟢 신규 12건  🟡 변경 5건  🔴 삭제 3건  ⚪ 동일 180건       │
│                                                                  │
│  [신규 (12)]  [변경 (5)]  [삭제 (3)]            ← 탭             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ☑ 상품 A    SKU-001    ₩45,000                          │   │
│  │ ☑ 상품 B    SKU-002    ₩32,000                          │   │
│  │ ☐ 상품 C    SKU-003    ₩18,000                          │   │
│  │ ...                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [전체 선택]  [전체 해제]         [선택 항목 적용 (14건)]          │
└─────────────────────────────────────────────────────────────────┘
```

**변경 탭 상세** — 필드별 이전값 → 새값 표시:
```
┌──────────────────────────────────────────────────────────┐
│ ☑ 상품 D (SKU-004)                                       │
│   price:  ₩45,000  →  ₩42,000                           │
│   imageUrl:  (변경됨)                                     │
│                                                           │
│ ☑ 상품 E (SKU-005)                                       │
│   name:  "구 상품명"  →  "신 상품명"                       │
│   productType:  "Shoes"  →  "Sneakers"                   │
└──────────────────────────────────────────────────────────┘
```

**삭제 탭** — Shopify에서 사라진 상품:
```
┌──────────────────────────────────────────────────────────┐
│ ☑ 상품 F (SKU-006)  →  유지 (기본)                        │
│ ☐ 상품 G (SKU-007)  →  비활성화                           │
│                                                           │
│ ※ 기본값: "유지". Shopify에서의 삭제가 의도적인 경우에만     │
│   "비활성화"를 선택하세요.                                  │
└──────────────────────────────────────────────────────────┘
```

---

### 3. ProductGroup 자동 매핑

Sync 실행 시 자동으로 크로스 스토어 Product를 그룹핑한다.

> [!info] ProductGroup 자동 매핑 로직
> 1. Product 생성/업데이트 완료 후, 해당 Shop의 Product를 SKU 기준으로 검색
> 2. 같은 SKU가 다른 몰에도 존재하면 → 기존 ProductGroup에 연결 또는 신규 생성 (canonicalSku = SKU)
> 3. SKU가 없으면 제조사 바코드(`shopifyBarcode`)로 시도
> 4. 둘 다 없거나 매칭 안 되면 → `productGroupId = null` (나중에 Admin UI에서 수동 매핑)
> 5. Sync 재실행 시 기존 ProductGroup에 upsert (`canonicalSku` 기준)

```
ProductGroup (canonicalSku: "ABC-001")
├── Product (Store A, sku: "ABC-001")
├── Product (Store B, sku: "ABC-001")
└── Product (Store C, sku: "ABC-001")
        ↕
    InventoryItem[] (실물 재고는 ProductGroup 단위로 조회)
```

> [!important] ProductGroup — 크로스 스토어 핵심
> 여러 몰에서 같은 실물 상품은 각각 다른 `Product` 레코드로 존재한다. `ProductGroup`이 이들을 하나로 묶어서:
> - **재고 조회**: 어느 몰 주문이든 ProductGroup으로 묶인 모든 Product의 InventoryItem을 조회
> - **자동 매핑**: Sync 시 SKU 또는 제조사 바코드가 같으면 자동으로 같은 ProductGroup에 연결
> - **수동 매핑**: SKU가 몰별로 다른 경우 Admin UI에서 직접 그룹 지정 가능

---

### 4. Product View 기능 명세

#### 뷰 모드

| 모드 | 용도 | 표시 정보 |
|------|------|----------|
| **리스트** | 대량 확인, 빠른 스캔 | 썸네일, 이름, SKU, 벤더, 몰, 가격 |
| **카드** | 시각적 확인 | 큰 이미지, 이름, 벤더, 가격, 재고 수량 |

#### 필터

| 필터 | 타입 | 옵션 |
|------|------|------|
| 쇼핑몰 | Multi-select | 동적 (등록된 Shop 목록에서 로드) |
| 벤더 | Multi-select | 동적 (DB에서 로드) |
| 상품 타입 | Multi-select | 동적 (DB에서 로드) |
| 재고 상태 | Single-select | 전체, 재고 있음, 재고 없음 |

#### 검색

| 검색 대상 | 매칭 방식 |
|----------|----------|
| 상품명 | 부분 매칭 (contains) |
| SKU | 정확/부분 매칭 |
| 바코드 | 정확 매칭 |

#### 정렬

이름 (A-Z/Z-A), 가격 (낮은순/높은순), **최근 업데이트 (기본)**, 벤더명

---

## 필요한 테이블 스키마

> [!note] 스키마 최종 기준: [[Schema Reference - BDJ Inventory]]
> 아래 스키마는 이 Phase에서 도입된 모델의 요약이다. 필드 추가/변경은 Schema Reference 문서를 기준으로 한다.

### ShopifyStore (확장)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| name | String | Shop 표시명 (예: "Store A") |
| domain | String (unique) | "store-a.myshopify.com" |
| accessToken | String | "shpat_xxx" (encrypted) |
| apiVersion | String | default "2025-01" |
| isActive | Boolean | default true |
| lastSyncedAt | DateTime? | 마지막 동기화 완료 시각 |
| syncStatus | String | 'NEVER' \| 'SYNCED' \| 'IN_PROGRESS' \| 'DIFF_REVIEW' \| 'FAILED' |
| productCount | Int | 동기화된 상품 수 (캐시, default 0) |

> [!info] ShopifyStore 확장 필드
> 기존 Phase 0-1 대비 `lastSyncedAt`, `syncStatus`, `productCount` 3개 필드 추가.
> `syncStatus`는 Shop List UI에서 각 몰의 현재 상태를 표시하는 데 사용한다.

### SyncLog (신규)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| shopifyStoreId | String | FK → ShopifyStore |
| syncType | String | 'INITIAL' \| 'RESYNC' |
| status | String | 'FETCHING' \| 'DIFF_REVIEW' \| 'APPLYING' \| 'COMPLETED' \| 'FAILED' |
| totalFetched | Int | Shopify에서 가져온 상품 수 |
| newCount | Int | default 0 — 신규 추가 수 |
| modifiedCount | Int | default 0 — 변경 수 |
| removedCount | Int | default 0 — Shopify에서 사라진 수 |
| unchangedCount | Int | default 0 — 동일 수 |
| appliedCount | Int | default 0 — 사용자가 실제 반영한 수 |
| diffData | Json? | Diff 상세 데이터 (재동기화 시 임시 저장) |
| startedAt | DateTime | @default(now()) |
| completedAt | DateTime? | 완료 시각 |
| error | String? | 에러 메시지 (실패 시) |

> [!info] SyncLog.diffData
> 재동기화 시 Diff Review를 위해 전체 diff를 JSON으로 임시 저장한다.
> 사용자가 항목별로 승인/거부 후 `appliedCount`에 실제 반영 수를 기록한다.
> 오래된 diffData는 정기적으로 정리할 수 있다.

**SyncLog 상태 흐름**:
```
[Initial Sync]
  FETCHING → APPLYING → COMPLETED (or FAILED)

[Re-Sync]
  FETCHING → DIFF_REVIEW → APPLYING → COMPLETED (or FAILED)
                ↑
         사용자 확인 대기
```

### Vendor

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| name | String (unique) | Vendor 이름 |
| code | String? (unique) | 내부 코드 (선택) |
| contactName | String? | 담당자명 (나중에 입력) |
| phone | String? | 전화번호 (나중에 입력) |
| email | String? | 이메일 (나중에 입력) |
| website | String? | 웹사이트 |
| address | String? | 주소 |
| notes | String? | 비고 |
| autoNotify | Boolean | default false |
| minLeadDays | Int | default 3 (리드타임) |
| isActive | Boolean | default true |

> [!info] Vendor 연락처
> Sync 시에는 **이름만** 저장. 연락처는 나중에 Admin UI에서 수동 입력.
> 향후 재고 부족 시 벤더 자동 알림 / 수동 발주에 활용.

### Product

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| name | String | 상품명 |
| description | String? | 설명 |
| imageUrl | String? | Shopify CDN URL (public) |
| sku | String? | SKU |
| shopifyBarcode | String? | 제조사 바코드 (UPC/EAN) |
| barcodePrefix | String (unique) | 개별 아이템 바코드 생성용 |
| productType | String? | 상품 유형 |
| price | Decimal? | 판매가 |
| compareAtPrice | Decimal? | 정가 (할인 전) |
| vendorId | String? | FK → Vendor |
| vendorName | String? | Shopify 원본 (매핑 전 백업) |
| shopifyProductId | String? | Shopify Product ID |
| shopifyVariantId | String? | Shopify Variant ID |
| shopifyStoreId | String? | FK → ShopifyStore |
| shopifySynced | Boolean | @default(true) |
| productGroupId | String? | FK → ProductGroup |

**인덱스**: sku, shopifyBarcode, name, vendorId, productType, shopifyStoreId, productGroupId
**유니크 제약**: shopifyStoreId + shopifyProductId + shopifyVariantId

### ProductGroup

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| canonicalSku | String? (unique) | 대표 SKU (자동 매핑 기준) |
| canonicalBarcode | String? (unique) | 대표 바코드 (UPC/EAN) |
| name | String | 대표 상품명 (첫 Sync 시 자동 설정) |
| productType | String? | 대표 상품 유형 |
| vendorId | String? | FK → Vendor |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

**관계**: ProductGroup → Product[] (1:N)

---

## API 엔드포인트

### Shop 관리 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/shops` | Shop 목록 (상태, 상품 수, 마지막 동기화 포함) |
| POST | `/api/shops` | Shop 추가 |
| GET | `/api/shops/:id` | Shop 상세 |
| PUT | `/api/shops/:id` | Shop 수정 |
| DELETE | `/api/shops/:id` | Shop 삭제 (soft delete) |

### Sync API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/shops/:id/sync` | 개별 Shop 동기화 시작 |
| POST | `/api/shops/sync-all` | 전체 활성 Shop 순차 동기화 |
| GET | `/api/shops/:id/sync/diff` | 현재 Diff 결과 조회 (DIFF_REVIEW 상태일 때) |
| POST | `/api/shops/:id/sync/apply` | Diff 적용 (body: 승인 항목 ID 배열) |
| GET | `/api/shops/:id/sync/logs` | Sync 이력 조회 |

> [!info] Sync API 흐름
> 1. `POST /api/shops/:id/sync` → 동기화 시작 (SyncLog 생성, status: FETCHING)
> 2. 첫 동기화 → 자동으로 APPLYING → COMPLETED
> 3. 재동기화 → FETCHING → DIFF_REVIEW (대기)
> 4. `GET /api/shops/:id/sync/diff` → Diff 데이터 조회
> 5. `POST /api/shops/:id/sync/apply` → 선택 항목 반영 → COMPLETED

### Product API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/products` | 검색, 필터, 정렬, 페이지네이션 통합 API |
| GET | `/api/product-groups` | 그룹별 상품 목록, 매핑 상태 |

**GET /api/products 파라미터**: search, storeIds[], vendorIds[], productTypes[], hasStock, sortBy, sortOrder, page, limit (기본 20)

**Response**에 `filters` 포함 → 동적 필터 옵션 (stores, vendors, productTypes + 각각의 count)

---

## 핵심 인사이트

- **Shop CRUD = 유연한 몰 관리**: 처음부터 4개 몰을 한꺼번에 등록할 필요 없이 하나씩 추가 가능. 새 몰 추가나 기존 몰 제거도 자유로움
- **Diff Review = 안전한 재동기화**: Shopify 데이터 변경사항을 무조건 덮어쓰지 않고, 사용자가 확인 후 선택적으로 적용. 의도치 않은 데이터 삭제 방지
- **ProductGroup = 크로스 스토어 핵심**: 여러 몰의 같은 실물 상품을 하나로 묶어서 재고 조회·발주를 가능하게 함. SKU 기준 자동 매핑 + Admin 수동 매핑 병행
- **Vendor 테이블 분리**: Sync 시 이름만 저장하되, 나중에 재고 부족 → 벤더 연락 자동화에 활용
- **vendorName 백업 필드**: Shopify 원본 벤더명 보관으로 매핑 전에도 검색 가능
- **imageUrl은 Public**: Shopify CDN 이미지는 인증 없이 외부에서 렌더링 가능
- **SyncLog로 이력 관리**: 모든 동기화 내역을 기록하여 추적·감사·디버깅 가능

---

## 체크리스트

### Shop 관리
- [ ] ShopifyStore 스키마 확장 (lastSyncedAt, syncStatus, productCount 추가)
- [ ] SyncLog 스키마 생성
- [ ] Shop List UI
- [ ] Shop 추가 폼 (Create)
- [ ] Shop 수정 폼 (Update)
- [ ] Shop 삭제 (Soft Delete + 확인 모달)
- [ ] Shop CRUD API (GET/POST/PUT/DELETE `/api/shops`)

### Sync 기능
- [ ] Shopify GraphQL API 연동 (Products Fetch + Pagination)
- [ ] 첫 동기화 로직 (전체 Import + Vendor Upsert + 결과 요약)
- [ ] 재동기화 Diff 생성 로직 (NEW/MODIFIED/REMOVED/UNCHANGED 분류)
- [ ] Diff Review UI (요약 대시보드 + 탭별 상세 + 일괄 액션)
- [ ] Diff 적용 로직 (선택 항목만 DB 반영)
- [ ] 전체 Sync (모든 활성 몰 순차 처리)
- [ ] SyncLog 기록
- [ ] Sync API (POST sync, GET diff, POST apply, GET logs)

### Product 데이터
- [ ] Vendor 스키마 생성
- [ ] Product 스키마 생성
- [ ] ProductGroup 스키마 생성
- [ ] Vendor Upsert 로직 (이름 기준)
- [ ] Product Upsert 로직 (shopifyProductId + shopifyVariantId 기준)
- [ ] ProductGroup 자동 매핑 로직 (SKU/바코드 기준)

### Product View UI
- [ ] GET `/api/products` API (필터, 검색, 정렬, 페이지네이션)
- [ ] GET `/api/product-groups` API (그룹별 상품 목록, 매핑 상태)
- [ ] Product List View
- [ ] Product Card View
- [ ] 뷰 토글 (리스트/카드)
- [ ] 필터 컴포넌트 (동적 Shop 목록)
- [ ] 검색 컴포넌트
- [ ] ProductGroup 매핑 Admin UI (수동 그룹 지정/해제)

---

## 관련 노트

- [[Schema Reference - BDJ Inventory]]
- [[Phase 0-2.  Inventory 초기 데이터 구축 - BDJ Inventory]]
- [[Phase 2.  쇼피파이 통합 최종버젼 - BDJ Inventory]]
- [[Shopify GraphQL Admin API]]
- [[Prisma ORM]]

---

## 🌐 English Summary

**Phase 0-1: Shop Management & Initial Product Data Setup** builds the data foundation for the BDJ Inventory system. Instead of bulk-importing all stores at once via script, it introduces **Shop CRUD** (add/edit/delete Shopify stores one by one with a list UI) and a **Sync feature** with two modes: (1) **Initial Sync** imports all active products from a newly added store immediately with a result summary, and (2) **Re-Sync** generates a **Diff Review** comparing current Shopify data against the DB — showing new (🟢), modified (🟡), and removed (🔴) products. Users can selectively approve/reject each change before applying. Default actions prioritize safety (new items added, modifications updated from Shopify, removed items preserved). **SyncLog** records every sync operation with counts and optional diff data for audit/debugging. ProductGroup auto-mapping (by SKU/barcode) runs after each sync to group cross-store products. The Product View UI provides list/card views, dynamic filters (store, vendor, type, stock), search, and sorting. API endpoints cover Shop CRUD (`/api/shops`), Sync operations (start sync, view diff, apply changes, view logs), and Product queries with pagination.
