---
created: 2026-02-06
tags:
  - BDJ-Inventory
  - Schema
  - Database
  - Prisma
  - Reference
source_url:
source_type: Other
channel: "[[BDJ Inventory]]"
status: Active
---

# Schema Reference - BDJ Inventory

> [!tldr] 💡 핵심 한 줄
> BDJ Inventory 시스템의 **전체 데이터 모델 단일 진실 공급원(Single Source of Truth)**. 16개 모델 + 23개 Enum의 최종 스키마.
>
> The **single source of truth** for all BDJ Inventory data models. 16 models + 23 enums covering shop management, product management, inventory tracking, webhook processing, order workflows, vendor purchasing, and audit logging.

> [!warning] 이 문서가 최종 기준
> 각 Phase 문서에도 스키마가 포함되어 있지만, **이 문서가 최종 버전**이다. 필드 추가/변경 시 반드시 이 문서를 먼저 업데이트하고, Phase 문서는 참조용으로만 사용.

## 모델 맵

```
┌─ 상품 & 재고 ─────────────────────────────────────────────┐
│  ShopifyStore ←→ Product ←→ ProductGroup                  │
│  ShopifyStore ←→ SyncLog (동기화 이력)                     │
│                  Product ←→ InventoryItem ←→ Location      │
│                  Product ←→ Vendor                         │
│                                                            │
├─ 웹훅 & 주문 ─────────────────────────────────────────────┤
│  WebhookEvent → Order → OrderLine → OrderWorkflow          │
│                                     → WorkflowStep         │
│                                                            │
├─ 발주 & 배송 ─────────────────────────────────────────────┤
│  PurchaseOrder → PurchaseOrderLine                         │
│  Shipment (← OrderLine)                                    │
│                                                            │
├─ 시스템 ──────────────────────────────────────────────────┤
│  User (인증/권한)                                          │
│  InventoryAuditLog (재고 변경 이력)                         │
└────────────────────────────────────────────────────────────┘
```

---

## 상품 & 재고

### ShopifyStore
> Phase 0-1에서 생성 (Shop CRUD + Sync), Phase 1에서 webhookSecret 추가

```prisma
model ShopifyStore {
  id              String            @id @default(cuid())
  name            String                                    // "Store A", "Store B"
  domain          String            @unique                 // "store-a.myshopify.com"
  accessToken     String                                    // "shpat_xxx" (암호화 저장)
  webhookSecret   String?                                   // Webhook 검증용 (몰별 분리)
  apiVersion      String            @default("2025-01")
  isActive        Boolean           @default(true)

  // Sync 관련
  lastSyncedAt    DateTime?                                 // 마지막 동기화 완료 시각
  syncStatus      ShopSyncStatus    @default(NEVER)         // 동기화 상태
  productCount    Int               @default(0)             // 동기화된 상품 수 (캐시)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  products        Product[]
  syncLogs        SyncLog[]
  webhookEvents   WebhookEvent[]
  orders          Order[]
}

enum ShopSyncStatus {
  NEVER             // 한 번도 동기화하지 않음
  SYNCED            // 동기화 완료
  IN_PROGRESS       // 동기화 진행 중
  DIFF_REVIEW       // Diff 확인 대기 (재동기화)
  FAILED            // 동기화 실패
}
```

### SyncLog (신규)
> Phase 0-1에서 생성 — Shop 동기화 이력 및 Diff 데이터 관리

```prisma
model SyncLog {
  id                String          @id @default(cuid())

  // 연결
  shopifyStoreId    String
  shopifyStore      ShopifyStore    @relation(fields: [shopifyStoreId], references: [id])

  // 동기화 정보
  syncType          SyncType                                // INITIAL | RESYNC
  status            SyncLogStatus   @default(FETCHING)

  // 결과 카운트
  totalFetched      Int             @default(0)             // Shopify에서 가져온 상품 수
  newCount          Int             @default(0)             // 신규 추가 수
  modifiedCount     Int             @default(0)             // 변경 수
  removedCount      Int             @default(0)             // Shopify에서 사라진 수
  unchangedCount    Int             @default(0)             // 동일 수
  appliedCount      Int             @default(0)             // 사용자가 실제 반영한 수

  // Diff 데이터
  diffData          Json?                                   // 재동기화 시 Diff 임시 저장

  // 타임스탬프
  startedAt         DateTime        @default(now())
  completedAt       DateTime?
  error             String?                                 // 에러 메시지 (실패 시)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([shopifyStoreId])
  @@index([status])
  @@index([startedAt])
}

enum SyncType {
  INITIAL           // 첫 동기화 (전체 Import)
  RESYNC            // 재동기화 (Diff Review)
}

enum SyncLogStatus {
  FETCHING          // Shopify API 데이터 수집 중
  DIFF_REVIEW       // Diff 확인 대기 (사용자 입력 필요)
  APPLYING          // 선택 항목 DB 반영 중
  COMPLETED         // 완료
  FAILED            // 실패
}
```

> [!info] SyncLog 활용
> - **첫 동기화**: FETCHING → APPLYING → COMPLETED (Diff Review 없이 바로 반영)
> - **재동기화**: FETCHING → DIFF_REVIEW → APPLYING → COMPLETED (사용자 확인 후 반영)
> - `diffData`에 신규/변경/삭제 상세를 JSON으로 임시 저장, 적용 후 정리 가능
> - `appliedCount`로 사용자가 실제 반영한 건수 추적

### ProductGroup
> Phase 0-1에서 생성 — 크로스 스토어 상품 매핑의 핵심

```prisma
model ProductGroup {
  id                String    @id @default(cuid())
  canonicalSku      String?   @unique               // 대표 SKU (자동 매핑 기준)
  canonicalBarcode  String?   @unique               // 대표 바코드 UPC/EAN (자동 매핑 기준)
  name              String                            // 대표 상품명
  productType       String?                           // 대표 상품 유형
  vendorId          String?
  vendor            Vendor?   @relation(fields: [vendorId], references: [id])
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  products          Product[]
  orderLines        OrderLine[]
}
```

> [!important] ProductGroup — 크로스 스토어 핵심
> 여러 몰에서 같은 실물 상품은 각각 다른 `Product` 레코드로 존재한다. `ProductGroup`이 이들을 하나로 묶어서:
> - **재고 조회**: 어느 몰 주문이든 ProductGroup으로 묶인 모든 Product의 InventoryItem을 조회
> - **자동 매핑**: Sync 시 SKU 또는 제조사 바코드가 같으면 자동으로 같은 ProductGroup에 연결
> - **수동 매핑**: SKU가 몰별로 다른 경우 Admin UI에서 직접 그룹 지정 가능
>
> ```
> ProductGroup (canonicalSku: "ABC-001")
> ├── Product (Store A, sku: "ABC-001")
> ├── Product (Store B, sku: "ABC-001")
> ├── Product (Store C, sku: "ABC-001")
> └── Product (Store D, sku: "ABC-001")
>         ↕
>     InventoryItem[] (실물 재고는 ProductGroup 단위로 조회)
> ```

### Product
> Phase 0-1에서 생성, Phase 0-2에서 shopifySynced 추가, productGroupId 추가

```prisma
model Product {
  id                String    @id @default(cuid())

  // 기본 정보
  name              String
  description       String?
  imageUrl          String?                           // Shopify CDN URL (public)

  // 식별자
  sku               String?
  shopifyBarcode    String?                           // 제조사 바코드 (UPC/EAN)
  barcodePrefix     String    @unique                 // 개별 아이템 바코드 생성용 (예: "BDJ-A1B2C3")

  // 분류
  productType       String?

  // 가격
  price             Decimal?
  compareAtPrice    Decimal?                          // 정가 (할인 전)

  // Vendor 연결
  vendorId          String?
  vendor            Vendor?   @relation(fields: [vendorId], references: [id])
  vendorName        String?                           // Shopify 원본 벤더명 (매핑 전 백업)

  // Shopify 연결
  shopifyProductId  String?
  shopifyVariantId  String?
  shopifyStoreId    String?
  shopifyStore      ShopifyStore? @relation(fields: [shopifyStoreId], references: [id])
  syncStatus        SyncStatus @default(SYNCED)          // Shopify 동기화 상태
  syncFailReason    String?                               // 실패 시 원인
  syncAttempts      Int        @default(0)                // 동기화 시도 횟수
  lastSyncAt        DateTime?                             // 마지막 동기화 시각

  // 크로스 스토어 매핑
  productGroupId    String?
  productGroup      ProductGroup? @relation(fields: [productGroupId], references: [id])

  // 재고 추적 방식
  trackingType      TrackingType @default(INDIVIDUAL)   // 개별 vs 벌크

  // 상태
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // 관계
  items             InventoryItem[]
  bulkInventory     BulkInventory[]

  // 인덱스
  @@index([sku])
  @@index([shopifyBarcode])
  @@index([name])
  @@index([vendorId])
  @@index([productType])
  @@index([shopifyStoreId])
  @@index([syncStatus])
  @@index([productGroupId])
  @@unique([shopifyStoreId, shopifyProductId, shopifyVariantId])
}
```

### Vendor
> Phase 0-1에서 생성, Phase 0-3에서 데이터 입력 확장

```prisma
model Vendor {
  id            String    @id @default(cuid())
  name          String    @unique
  code          String?   @unique                     // 내부 코드 (예: "NK-KR")
  contactName   String?                               // 담당자명
  phone         String?
  email         String?
  website       String?
  address       String?
  notes         String?                               // "월요일 오전 연락 선호"
  autoNotify    Boolean   @default(false)             // 재고 부족 시 자동 알림
  minLeadDays   Int       @default(3)                 // 발주~입고 리드타임 (일)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  products       Product[]
  productGroups  ProductGroup[]
  purchaseOrders PurchaseOrder[]
}
```

### Location
> Phase 0-2에서 생성 — 계층적 창고 위치 관리

```prisma
model Location {
  id          String     @id @default(cuid())
  name        String                                  // "1층", "지하", "A구역"
  code        String     @unique                      // "F1", "B1", "F1-A"
  parentId    String?
  parent      Location?  @relation("LocationTree", fields: [parentId], references: [id])
  children    Location[] @relation("LocationTree")
  level       Int        @default(0)                  // 0=건물, 1=층, 2=구역, 3=선반
  description String?
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  items       InventoryItem[]
}
```

### InventoryItem
> Phase 0-2에서 생성 — 개별 아이템 추적

```prisma
model InventoryItem {
  id              String          @id @default(cuid())
  barcode         String          @unique               // "BDJ-A1B2C3-001"
  productId       String
  product         Product         @relation(fields: [productId], references: [id])
  locationId      String?
  location        Location?       @relation(fields: [locationId], references: [id])
  status          InventoryStatus @default(AVAILABLE)
  condition       ItemCondition   @default(NEW)
  notes           String?
  receivedAt      DateTime        @default(now())
  soldAt          DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // 감사 로그
  auditLogs       InventoryAuditLog[]

  @@index([productId])
  @@index([locationId])
  @@index([status])
  @@index([barcode])
}

enum InventoryStatus {
  AVAILABLE       // 판매 가능
  RESERVED        // 주문에 의해 예약됨
  SOLD            // 판매 완료
  RETURNED        // 반품됨
  DAMAGED         // 파손
}

enum ItemCondition {
  NEW
  LIKE_NEW
  GOOD
  FAIR
  POOR
}

enum SyncStatus {
  SYNCED            // Shopify와 정상 동기화됨
  PENDING           // 동기화 대기 중 (수동 생성 직후)
  FAILED            // 동기화 실패 (syncFailReason에 원인 기록)
  PARTIAL           // 부분 동기화 (일부 필드만 반영)
}

enum TrackingType {
  INDIVIDUAL        // 개별 추적: 아이템마다 고유 바코드 (고가 상품, 전자기기 등)
  BULK              // 수량 추적: 총 수량만 관리 (소모품, 저가 상품 등)
}
```

### BulkInventory (신규)
> 수량 기반 재고 관리 — trackingType: BULK인 Product에 사용

```prisma
model BulkInventory {
  id              String          @id @default(cuid())
  productId       String
  product         Product         @relation(fields: [productId], references: [id])
  locationId      String
  location        Location        @relation(fields: [locationId], references: [id])

  // 수량
  quantity        Int             @default(0)           // 현재 수량
  reservedQty     Int             @default(0)           // 예약된 수량
  availableQty    Int             @default(0)           // 판매 가능 수량 (quantity - reservedQty)

  // 마지막 실사
  lastCountedAt   DateTime?
  lastCountedBy   String?                               // FK → User.id

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([productId, locationId])                     // 상품+위치 조합당 1레코드
  @@index([productId])
  @@index([locationId])
  @@index([availableQty])
}
```

> [!info] INDIVIDUAL vs BULK 재고 추적
> | | INDIVIDUAL | BULK |
> |--|-----------|------|
> | **대상** | 고가 상품, 전자기기, 브랜드 신발 | 소모품, 저가 액세서리, 포장재 |
> | **추적** | 아이템별 고유 바코드 (BDJ-XX-001) | 위치별 총 수량 |
> | **입고** | 개별 스캔 → InventoryItem 생성 | 수량 입력 → BulkInventory.quantity 증가 |
> | **출고** | 아이템 스캔 → status: SOLD | 수량 차감 → BulkInventory.quantity 감소 |
> | **반품** | 아이템 스캔 → status: RETURNED | 수량 복원 → BulkInventory.quantity 증가 |
> | **테이블** | InventoryItem (N rows) | BulkInventory (1 row per product+location) |
>
> 재고 조회 시 `Product.trackingType`에 따라 InventoryItem 또는 BulkInventory를 쿼리.

---

## 웹훅 & 주문

### WebhookEvent
> Phase 1에서 생성

```prisma
model WebhookEvent {
  id              String              @id @default(cuid())
  shopifyStoreId  String
  shopifyStore    ShopifyStore        @relation(fields: [shopifyStoreId], references: [id])
  topic           String                                // "orders/create", "products/update"
  shopifyId       String                                // Shopify 리소스 ID
  payload         Json
  status          WebhookStatus       @default(RECEIVED)
  processedAt     DateTime?
  errorMessage    String?
  retryCount      Int                 @default(0)
  idempotencyKey  String              @unique           // "{topic}:{domain}:{shopifyId}"
  receivedAt      DateTime            @default(now())
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  orders          Order[]

  @@index([shopifyStoreId])
  @@index([topic])
  @@index([status])
  @@index([receivedAt])
}

enum WebhookStatus {
  RECEIVED        // 수신 완료, 처리 대기
  PROCESSING      // 처리 중
  PROCESSED       // 처리 완료
  FAILED          // 처리 실패
  SKIPPED         // 중복 등으로 건너뜀
}
```

### Order
> Phase 2에서 생성

```prisma
model Order {
  id                String              @id @default(cuid())

  // 연결
  webhookEventId    String
  webhookEvent      WebhookEvent        @relation(fields: [webhookEventId], references: [id])
  shopifyStoreId    String
  shopifyStore      ShopifyStore        @relation(fields: [shopifyStoreId], references: [id])

  // 주문 정보
  shopifyOrderId    String
  orderNumber       String
  customerEmail     String?
  orderData         Json                              // Shopify 원본 데이터 (백업)

  // 상태
  status            OrderStatus         @default(RECEIVED)

  // 타임스탬프
  receivedAt        DateTime            @default(now())
  completedAt       DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  lines             OrderLine[]

  @@unique([shopifyStoreId, shopifyOrderId])
  @@index([status])
  @@index([customerEmail])
  @@index([orderNumber])
}

enum OrderStatus {
  RECEIVED          // 주문 수신
  PROCESSING        // 워크플로우 진행 중
  PARTIALLY_DONE    // 일부 라인 완료
  COMPLETED         // 전체 완료
  CANCELLED         // 취소
}
```

### OrderLine
> Phase 2에서 생성 — 혼합 재고 대응을 위해 아이템 단위 워크플로우 분리

```prisma
model OrderLine {
  id                String              @id @default(cuid())

  // 연결
  orderId           String
  order             Order               @relation(fields: [orderId], references: [id])
  productGroupId    String?
  productGroup      ProductGroup?       @relation(fields: [productGroupId], references: [id])

  // Shopify 원본
  shopifyLineItemId String
  shopifyProductId  String?
  shopifyVariantId  String?
  sku               String?
  title             String
  quantity          Int
  price             Decimal

  // 워크플로우 (1:1)
  workflowId        String?             @unique
  workflow          OrderWorkflow?      @relation(fields: [workflowId], references: [id])

  // 배송
  shipmentId        String?
  shipment          Shipment?           @relation(fields: [shipmentId], references: [id])

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([orderId])
  @@index([productGroupId])
}
```

### OrderWorkflow
> Phase 2에서 생성

```prisma
model OrderWorkflow {
  id                String              @id @default(cuid())

  // 연결 (OrderLine에서 참조)
  orderLine         OrderLine?

  // 워크플로우 상태
  workflowType      WorkflowType
  status            WorkflowStatus      @default(STARTED)
  currentStep       Int                 @default(1)

  // 타임스탬프
  startedAt         DateTime            @default(now())
  completedAt       DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  steps             WorkflowStep[]

  @@index([status])
  @@index([workflowType])
}

enum WorkflowType {
  IN_STOCK          // CASE 1: 재고 있음 (6스텝)
  OUT_OF_STOCK      // CASE 2: 재고 없음 (8스텝)
}

enum WorkflowStatus {
  STARTED           // 워크플로우 시작됨
  WAITING_MANUAL    // 수동 스텝 대기 중
  IN_PROGRESS       // 처리 중
  COMPLETED         // 모든 스텝 완료
  CANCELLED         // 주문 취소 등으로 중단
  FAILED            // 시스템 오류
}
```

### WorkflowStep
> Phase 2에서 생성, SLA/timeout 필드 추가

```prisma
model WorkflowStep {
  id                String              @id @default(cuid())

  // 연결
  workflowId        String
  workflow          OrderWorkflow       @relation(fields: [workflowId], references: [id])

  // 스텝 정보
  stepNumber        Int
  name              String                              // "주문 자동 수집", "출고 처리 클릭"
  description       String?
  type              StepType                            // AUTO, MANUAL

  // 상태
  status            StepStatus          @default(PENDING)
  startedAt         DateTime?
  completedAt       DateTime?
  completedBy       String?                             // FK → User.id (수동 스텝 처리자)

  // 알림
  notifiedAt        DateTime?
  notifyChannels    String[]                            // ["email", "slack"]

  // SLA / Timeout (수동 스텝)
  dueAt             DateTime?                           // 마감 시한 (MANUAL 스텝 전용)
  escalatedAt       DateTime?                           // 에스컬레이션 발생 시각
  escalatedTo       String?                             // 에스컬레이션 대상 User.id

  // 데이터
  inputData         Json?                               // 이전 스텝에서 넘어온 데이터
  outputData        Json?                               // 이 스텝의 처리 결과
  errorMessage      String?

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@unique([workflowId, stepNumber])
  @@index([status])
  @@index([dueAt])
}

enum StepType {
  AUTO              // 시스템 자동 실행
  MANUAL            // 사용자 액션 필요
}

enum StepStatus {
  PENDING           // 대기
  RUNNING           // 실행 중 (자동 스텝)
  WAITING           // 사용자 입력 대기 (수동 스텝)
  COMPLETED         // 완료
  SKIPPED           // 건너뜀
  FAILED            // 실패
}
```

> [!tip] 수동 스텝 SLA 정책
> MANUAL 스텝 생성 시 `dueAt`을 자동 설정:
> - 일반 스텝: 생성 후 **4시간**
> - 배송 처리: 생성 후 **24시간**
> - 발주 확인: 생성 후 **8시간**
>
> `dueAt` 초과 시 Cron이 감지하여:
> 1. `escalatedAt` 기록
> 2. `escalatedTo`에 매니저 지정
> 3. Slack/이메일로 에스컬레이션 알림 발송
> 4. 대시보드에 ⚠️ 마감 초과 표시

---

## 발주 & 배송

### PurchaseOrder (신규)
> CASE 2 (재고 없음) 워크플로우에서 벤더에게 발주할 때 사용

```prisma
model PurchaseOrder {
  id                String              @id @default(cuid())

  // 벤더
  vendorId          String
  vendor            Vendor              @relation(fields: [vendorId], references: [id])

  // 상태
  status            PurchaseOrderStatus @default(DRAFT)
  poNumber          String              @unique         // 자동 생성 (예: "PO-2026-001")

  // 금액
  totalAmount       Decimal?
  currency          String              @default("KRW")

  // 일정
  orderedAt         DateTime?                           // 발주 전송 시각
  expectedAt        DateTime?                           // 예상 입고일
  receivedAt        DateTime?                           // 실제 입고일

  // 메모
  notes             String?
  vendorReference   String?                             // 벤더측 참조번호

  // 생성자
  createdById       String?
  createdBy         User?               @relation("POCreator", fields: [createdById], references: [id])

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  lines             PurchaseOrderLine[]

  @@index([vendorId])
  @@index([status])
  @@index([poNumber])
}

enum PurchaseOrderStatus {
  DRAFT             // 작성 중
  SENT              // 벤더에게 전송됨
  ACKNOWLEDGED      // 벤더 확인
  PARTIALLY_RECEIVED // 부분 입고
  RECEIVED          // 전체 입고 완료
  CANCELLED         // 취소
}
```

### PurchaseOrderLine (신규)
> 발주서의 개별 아이템

```prisma
model PurchaseOrderLine {
  id                String              @id @default(cuid())

  // 연결
  purchaseOrderId   String
  purchaseOrder     PurchaseOrder       @relation(fields: [purchaseOrderId], references: [id])
  productGroupId    String
  productGroup      ProductGroup        @relation(fields: [productGroupId], references: [id])

  // 수량
  quantity          Int                                 // 발주 수량
  receivedQuantity  Int                 @default(0)     // 입고된 수량
  unitPrice         Decimal?

  // 연결된 주문 (어떤 주문 때문에 발주했는지)
  orderLineId       String?                             // FK → OrderLine (추적용)

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([purchaseOrderId])
  @@index([productGroupId])
}
```

> [!info] PurchaseOrder 워크플로우 연동
> CASE 2 워크플로우의 "발주 버튼 클릭" 수동 스텝에서:
> 1. 시스템이 자동으로 PurchaseOrder(DRAFT) + PurchaseOrderLine 생성
> 2. 사용자가 확인 후 "발주 전송" → status: SENT
> 3. 물건 도착 → "입고 확인" 수동 스텝에서 receivedQuantity 업데이트
> 4. 전체 입고 시 status: RECEIVED → 대기 주문 자동 매칭

### Shipment (신규)
> 출고/배송 추적

```prisma
model Shipment {
  id                String              @id @default(cuid())

  // 배송 정보
  carrier           CarrierType?                        // 택배사
  trackingNumber    String?
  trackingUrl       String?

  // 상태
  status            ShipmentStatus      @default(PREPARING)
  shippedAt         DateTime?
  deliveredAt       DateTime?

  // 생성자
  processedById     String?
  processedBy       User?               @relation("ShipmentProcessor", fields: [processedById], references: [id])

  notes             String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  orderLines        OrderLine[]

  @@index([trackingNumber])
  @@index([status])
}

enum CarrierType {
  CJ                // CJ대한통운
  HANJIN            // 한진택배
  LOTTE             // 롯데택배
  LOGEN             // 로젠택배
  POST              // 우체국택배
  FEDEX
  UPS
  DHL
  OTHER
}

enum ShipmentStatus {
  PREPARING         // 출고 준비 중
  SHIPPED           // 발송 완료
  IN_TRANSIT        // 배송 중
  DELIVERED         // 배달 완료
  FAILED            // 배송 실패
}
```

---

## 반품

### ReturnRequest (신규)
> 반품 접수 → 검수 → 재입고 or 폐기

```prisma
model ReturnRequest {
  id                String              @id @default(cuid())

  // 연결
  orderLineId       String
  orderLine         OrderLine           @relation(fields: [orderLineId], references: [id])
  inventoryItemId   String?                             // INDIVIDUAL 추적 시
  inventoryItem     InventoryItem?      @relation(fields: [inventoryItemId], references: [id])

  // 반품 정보
  reason            ReturnReason
  reasonDetail      String?                             // 상세 사유
  quantity          Int                 @default(1)     // BULK인 경우 수량

  // 검수
  inspectionStatus  InspectionStatus    @default(PENDING)
  inspectionNotes   String?
  inspectedById     String?                             // FK → User.id
  inspectedAt       DateTime?

  // 결과
  resolution        ReturnResolution?                   // 검수 후 결정
  refundAmount      Decimal?

  // 상태
  status            ReturnStatus        @default(REQUESTED)
  requestedAt       DateTime            @default(now())
  completedAt       DateTime?

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([orderLineId])
  @@index([status])
  @@index([inspectionStatus])
}

enum ReturnReason {
  DEFECTIVE         // 불량
  WRONG_ITEM        // 오배송
  DAMAGED_SHIPPING  // 배송 중 파손
  CUSTOMER_CHANGE   // 고객 변심
  SIZE_EXCHANGE     // 사이즈 교환
  OTHER
}

enum InspectionStatus {
  PENDING           // 검수 대기
  IN_PROGRESS       // 검수 중
  PASSED            // 양호 (재입고 가능)
  FAILED            // 불량 (폐기 또는 벤더 반송)
}

enum ReturnResolution {
  RESTOCK           // 재입고 → AVAILABLE
  DISPOSE           // 폐기 → DAMAGED
  VENDOR_RETURN     // 벤더에게 반송
  EXCHANGE          // 교환 처리
}

enum ReturnStatus {
  REQUESTED         // 반품 접수
  RECEIVED          // 물건 수령
  INSPECTING        // 검수 중
  RESOLVED          // 처리 완료
  CANCELLED         // 취소
}
```

> [!info] 반품 워크플로우 흐름
> ```
> [반품 접수] → [물건 수령] → [검수]
>                                │
>                    ┌───────────┼───────────┐
>                    ▼           ▼           ▼
>              [PASSED]    [FAILED]    [벤더 반송]
>                 │            │           │
>                 ▼            ▼           ▼
>            재입고         폐기        PurchaseOrder
>          (AVAILABLE)   (DAMAGED)     (벤더 클레임)
> ```
> - INDIVIDUAL 상품: 해당 InventoryItem의 status를 직접 변경
> - BULK 상품: BulkInventory.quantity를 조정
> - 검수 PASSED → `InventoryAuditLog`에 RETURNED → AVAILABLE 기록

---

## 시스템

### User (신규)
> 인증, 권한, 감사 추적

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  role          UserRole  @default(STAFF)
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  purchaseOrdersCreated  PurchaseOrder[]       @relation("POCreator")
  shipmentsProcessed     Shipment[]            @relation("ShipmentProcessor")
  auditLogs              InventoryAuditLog[]

  @@index([email])
  @@index([role])
}

enum UserRole {
  ADMIN             // 전체 관리자
  MANAGER           // 매니저 (승인, 에스컬레이션 수신)
  STAFF             // 일반 직원 (창고 작업, 주문 처리)
  VIEWER            // 읽기 전용
}
```

> [!info] 인증 방식
> NextAuth.js 또는 Clerk 사용 예정. 초기에는 이메일 + 비밀번호 또는 Google OAuth.
> `WorkflowStep.completedBy`와 `WorkflowStep.escalatedTo`는 User.id를 참조.

### InventoryAuditLog (신규)
> 재고 상태 변경의 전체 이력 추적

```prisma
model InventoryAuditLog {
  id                String              @id @default(cuid())

  // 대상
  inventoryItemId   String
  inventoryItem     InventoryItem       @relation(fields: [inventoryItemId], references: [id])

  // 변경 내용
  action            AuditAction
  oldStatus         InventoryStatus?
  newStatus         InventoryStatus?
  oldLocationId     String?
  newLocationId     String?

  // 누가
  userId            String?
  user              User?               @relation(fields: [userId], references: [id])
  source            AuditSource                         // 변경 원인

  // 컨텍스트
  orderId           String?                             // 주문에 의한 변경 시
  webhookEventId    String?                             // 웹훅에 의한 변경 시
  notes             String?

  createdAt         DateTime            @default(now())

  @@index([inventoryItemId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

enum AuditAction {
  CREATED           // 아이템 생성 (입고)
  STATUS_CHANGED    // 상태 변경 (AVAILABLE → RESERVED 등)
  LOCATION_MOVED    // 위치 이동
  CONDITION_CHANGED // 컨디션 변경
  DELETED           // 삭제 (soft)
}

enum AuditSource {
  MANUAL            // 사용자 직접 변경
  WEBHOOK           // Shopify 웹훅에 의한 자동 변경
  WORKFLOW          // 워크플로우 자동 스텝
  SCAN              // 바코드 스캔
  IMPORT            // Import 스크립트
  SYSTEM            // 시스템 자동 처리
}
```

> [!tip] AuditLog 활용 예시
> - "이 아이템은 언제 누가 SOLD로 바꿨나?" → inventoryItemId + action: STATUS_CHANGED
> - "오늘 창고에서 위치 이동된 아이템 목록" → action: LOCATION_MOVED + createdAt
> - "웹훅으로 자동 차감된 아이템 이력" → source: WEBHOOK
> - "이 주문과 관련된 모든 재고 변경" → orderId

---

## Enum 전체 요약

| Enum | 값 | 정의 Phase |
|------|-----|-----------|
| InventoryStatus | AVAILABLE, RESERVED, SOLD, RETURNED, DAMAGED | 0-2 |
| ItemCondition | NEW, LIKE_NEW, GOOD, FAIR, POOR | 0-2 |
| WebhookStatus | RECEIVED, PROCESSING, PROCESSED, FAILED, SKIPPED | 1 |
| OrderStatus | RECEIVED, PROCESSING, PARTIALLY_DONE, COMPLETED, CANCELLED | 2 |
| WorkflowType | IN_STOCK, OUT_OF_STOCK | 2 |
| WorkflowStatus | STARTED, WAITING_MANUAL, IN_PROGRESS, COMPLETED, CANCELLED, FAILED | 2 |
| StepType | AUTO, MANUAL | 2 |
| StepStatus | PENDING, RUNNING, WAITING, COMPLETED, SKIPPED, FAILED | 2 |
| PurchaseOrderStatus | DRAFT, SENT, ACKNOWLEDGED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED | 신규 |
| ShipmentStatus | PREPARING, SHIPPED, IN_TRANSIT, DELIVERED, FAILED | 신규 |
| CarrierType | CJ, HANJIN, LOTTE, LOGEN, POST, FEDEX, UPS, DHL, OTHER | 신규 |
| UserRole | ADMIN, MANAGER, STAFF, VIEWER | 신규 |
| SyncStatus | SYNCED, PENDING, FAILED, PARTIAL | 신규 |
| TrackingType | INDIVIDUAL, BULK | 신규 |
| AuditAction | CREATED, STATUS_CHANGED, LOCATION_MOVED, CONDITION_CHANGED, DELETED | 신규 |
| AuditSource | MANUAL, WEBHOOK, WORKFLOW, SCAN, IMPORT, SYSTEM | 신규 |
| ReturnReason | DEFECTIVE, WRONG_ITEM, DAMAGED_SHIPPING, CUSTOMER_CHANGE, SIZE_EXCHANGE, OTHER | 신규 |
| InspectionStatus | PENDING, IN_PROGRESS, PASSED, FAILED | 신규 |
| ReturnResolution | RESTOCK, DISPOSE, VENDOR_RETURN, EXCHANGE | 신규 |
| ReturnStatus | REQUESTED, RECEIVED, INSPECTING, RESOLVED, CANCELLED | 신규 |
| ShopSyncStatus | NEVER, SYNCED, IN_PROGRESS, DIFF_REVIEW, FAILED | 0-1 |
| SyncType | INITIAL, RESYNC | 0-1 |
| SyncLogStatus | FETCHING, DIFF_REVIEW, APPLYING, COMPLETED, FAILED | 0-1 |

---

## 관계도 (ER Diagram 요약)

```
ShopifyStore (1) ──→ (N) Product
ShopifyStore (1) ──→ (N) SyncLog              ← 동기화 이력
ShopifyStore (1) ──→ (N) WebhookEvent
ShopifyStore (1) ──→ (N) Order

Vendor (1) ──→ (N) Product
Vendor (1) ──→ (N) ProductGroup
Vendor (1) ──→ (N) PurchaseOrder

ProductGroup (1) ──→ (N) Product           ← 크로스 스토어 매핑
ProductGroup (1) ──→ (N) OrderLine
ProductGroup (1) ──→ (N) PurchaseOrderLine

Product (1) ──→ (N) InventoryItem

Location (self) ──→ Location (계층)
Location (1) ──→ (N) InventoryItem

WebhookEvent (1) ──→ (N) Order

Order (1) ──→ (N) OrderLine
OrderLine (1) ──→ (1) OrderWorkflow
OrderLine (N) ──→ (1) Shipment

OrderWorkflow (1) ──→ (N) WorkflowStep

PurchaseOrder (1) ──→ (N) PurchaseOrderLine

OrderLine (1) ──→ (N) ReturnRequest
InventoryItem (1) ──→ (N) ReturnRequest

User (1) ──→ (N) PurchaseOrder (creator)
User (1) ──→ (N) Shipment (processor)
User (1) ──→ (N) InventoryAuditLog

InventoryItem (1) ──→ (N) InventoryAuditLog
```

---

## Phase별 스키마 도입 정리

| Phase | 도입 모델 | 변경 모델 |
|-------|----------|----------|
| 0-1 | ShopifyStore, Vendor, Product, ProductGroup, SyncLog | ShopifyStore (lastSyncedAt, syncStatus, productCount 추가) |
| 0-2 | Location, InventoryItem | Product (shopifySynced 추가) |
| 0-3 | — | — (Vendor 데이터 입력만) |
| 1 | WebhookEvent | ShopifyStore (webhookSecret 추가) |
| 2 | Order, OrderLine, OrderWorkflow, WorkflowStep | — |
| 신규 | User, PurchaseOrder, PurchaseOrderLine, Shipment, InventoryAuditLog, BulkInventory, ReturnRequest | Product (isActive, trackingType, syncStatus 추가), WorkflowStep (SLA 필드 추가) |

---

## 관련 노트

- [[Phase 0-1 Product 초기 데이터 구축]]
- [[Phase 0-2 Inventory 초기 데이터 구축]]
- [[Phase 0-3 벤더 초기 데이터 구축]]
- [[Phase 1 Shopify Webhook 구현 및 테스트]]
- [[Phase 2 쇼피파이 통합 최종버젼]]
- [[Prisma ORM]]

---

## 🌐 English Summary

**Schema Reference** is the single source of truth for the BDJ Inventory database. It consolidates 16 models across all phases: shop management (ShopifyStore with CRUD + Sync, SyncLog for sync history with diff review), product management (ProductGroup, Product, Vendor), inventory tracking (Location, InventoryItem, BulkInventory), webhook processing (WebhookEvent), order workflows (Order, OrderLine, OrderWorkflow, WorkflowStep), vendor purchasing (PurchaseOrder, PurchaseOrderLine), shipping (Shipment), returns (ReturnRequest), and system models (User, InventoryAuditLog). Key design decisions include: Shop CRUD with incremental sync and diff review, ProductGroup for cross-store product mapping, OrderLine-level workflows for mixed-stock orders, SLA/timeout fields on WorkflowStep for stuck workflow prevention, and InventoryAuditLog for complete change history tracking.
