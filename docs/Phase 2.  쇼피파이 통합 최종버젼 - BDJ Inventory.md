---
created: 2026-02-05
tags:
  - Shopify
  - Webhook
  - Inventory
  - Phase2
  - Workflow
  - Automation
source_url:
source_type: Other
channel: "[[BDJ Inventory]]"
status: Summarized
---

# Phase 2: 쇼피파이 통합 — 주문 워크플로우 자동화

> [!tldr] 💡 핵심 한 줄
> Phase 1 웹훅 파이프라인 위에 **주문 워크플로우 엔진**을 올려서, 자동 스텝은 즉시 실행하고 수동 스텝에서는 멈춰서 알림을 보내는 **반자동 주문 처리 시스템**을 구현한다.
>
> Build an order workflow engine on top of Phase 1 webhooks — auto-steps execute instantly, manual steps pause and notify the user via email/Slack, achieving 69~83% time savings per order.

## 핵심 요약

Phase 1에서 검증 완료한 Shopify Webhook 파이프라인을 기반으로, 주문 이벤트 발생 시 **워크플로우를 자동 생성**한다. 각 스텝은 자동(🟢) 또는 수동(🟠)으로 구분되며, 자동 스텝은 시스템이 즉시 처리하고 수동 스텝에서는 워크플로우가 일시정지되어 사용자에게 알림(이메일, Slack)을 보낸다. 재고 있는 경우 16분→5분(69% 절약), 재고 없는 경우 35분→6분(83% 절약).

## 주요 내용

### Phase 1 → Phase 2 연결 구조
```
Phase 1 (완료)                    Phase 2 (이 문서)
┌──────────────────┐             ┌──────────────────────────┐
│ Webhook 수신     │             │ 워크플로우 엔진          │
│ HMAC 검증        │──RECEIVED──▶│ 스텝별 자동/수동 실행    │
│ WebhookEvent 저장│             │ 알림 시스템              │
│ 즉시 200 OK      │             │ 재고 자동 차감           │
└──────────────────┘             └──────────────────────────┘
```

Phase 1의 Topic별 핸들러(`orders/create`, `orders/cancelled` 등)에서 **로그만 찍던 부분**을 실제 비즈니스 로직으로 교체한다.

### CASE 1: 재고 있는 경우 — 워크플로우

> [!success] 69% 시간 절약 (16분 → 5분, 11분 단축)

| 스텝 | 작업 | 타입 | 시간 |
|------|------|------|------|
| 1 | 주문 자동 수집 (웹훅) | 🟢 자동 | — |
| 2 | 재고 자동 확인 + 예약 | 🟢 자동 | — |
| 3 | 통합 대시보드에서 확인 | 🟠 수동 | 1분 |
| 4 | 출고 처리 클릭 | 🟠 수동 | 1분 |
| 5 | 재고 자동 차감 (BDJ DB) | 🟢 자동 | — |
| 6 | 배송 처리 + 송장 입력 | 🟠 수동 | 3분 |

**장점:**
- 화면 전환 0회
- 재고 자동 차감 (BDJ 시스템 내)
- 내부 이중 예약 방지

**vs 인벤토리 앱 Only (16분):**
몰 A, B, C 각각 열어서 주문 확인(6분) → 인벤토리 앱 전환(1분) → 바코드 스캔/검색(2분) → 재고 수량 확인(1분) → 수량 수동 차감(2분) → 쇼피파이로 돌아가기(1분) → 배송 처리(3분). 화면 전환 4회, 수동 입력 3회, 동기화 안 됨.

### CASE 2: 재고 없는 경우 — 워크플로우

> [!warning] 83% 시간 절약 (35분 → 6분, 29분 단축)

| 스텝 | 작업 | 타입 | 시간 |
|------|------|------|------|
| 1 | 주문 자동 수집 → 재고 부족 감지 | 🟢 자동 | — |
| 2 | ⚠️ 발주 필요 알림 (벤더 자동 매칭) | 🟢 자동 | — |
| 3 | 발주 버튼 클릭 | 🟠 수동 | 1분 |
| 4 | 고객 자동 알림: "상품 준비 중" | 🟢 자동 | — |
| — | *[ 며칠 후 물건 도착 ]* | — | — |
| 5 | 바코드 스캔 → 대기 주문 자동 매칭 | 🟠 수동 | 1분 |
| 6 | 입고 확인 + 출고 클릭 | 🟠 수동 | 1분 |
| 7 | 배송 처리 + 송장 입력 | 🟠 수동 | 3분 |
| 8 | 고객 자동 알림: "발송 완료" | 🟢 자동 | — |

**장점:**
- 발주 자동 추적
- 고객-주문 자동 매칭
- 실시간 상태 확인
- 고객 자동 알림

**vs 인벤토리 앱 Only (35분):**
몰 각각 주문 확인(6분) → 재고 확인→없음(3분) → 엑셀/메모에서 벤더 찾기(3분) → 벤더에게 이메일/카톡 발주(5분) → 발주 내역 메모장 기록(2분) → 고객에게 지연 안내 수동 발송(3분) → 물건 도착 후 메모 뒤져서 고객 찾기(5분) → 어느 몰 주문인지 확인(3분) → 입고 수량 추가(2분) → 배송 처리(3분). 발주 추적 불가, 고객-주문 매칭 실수 위험, 상태 확인 불가, 머릿속 기억에 의존.

### 종합 비교 (하루 10건 주문 기준)

| 항목 | 수치 |
|------|------|
| CASE 1 (재고 있음 7건) | 16분 → 5분 (69% ↓) |
| CASE 2 (재고 없음 3건) | 35분 → 6분 (83% ↓) |
| 일일 총합 절약 | **217분** |
| 월간 절약 | **55시간** (≈ 7일 근무시간) |

### 워크플로우 엔진 설계

#### 핵심 개념: 자동/수동 스텝 분기
```
WebhookEvent (RECEIVED)
        │
        ▼
  WorkflowInstance 생성
        │
        ▼
  ┌─ Step 1: 자동 ──▶ 즉시 실행 ──▶ 다음 스텝
  │
  ├─ Step 2: 자동 ──▶ 즉시 실행 ──▶ 다음 스텝
  │
  ├─ Step 3: 수동 ──▶ ⏸️ 일시정지
  │                    │
  │                    ├─ 이메일 알림 발송
  │                    ├─ Slack 알림 발송
  │                    └─ 대시보드에 표시
  │                    │
  │                    ▼ (사용자 액션)
  │                    ✅ 완료 처리 ──▶ 다음 스텝
  │
  └─ Step N: 자동 ──▶ 즉시 실행 ──▶ 워크플로우 완료
```

#### 스키마 설계

> [!note] 스키마 최종 기준: [[Schema Reference - BDJ Inventory]]
> 아래 스키마는 이 Phase에서 도입된 모델의 요약이다. User, PurchaseOrder, Shipment, AuditLog 등 신규 모델은 Schema Reference 참고.

> [!important] 혼합 재고 대응: Order → OrderLine → Workflow 구조
> 하나의 주문에 재고 있는 상품과 없는 상품이 섞일 수 있다. 주문 단위가 아닌 **OrderLine 단위**로 워크플로우를 분리하여, 각 아이템이 독립적으로 IN_STOCK / OUT_OF_STOCK 경로를 탈 수 있도록 한다.
> ```
> Order #1052 (BDJ Main)
> ├── OrderLine: Air Max 90 x2 → 재고 있음 → IN_STOCK 워크플로우 (6스텝)
> ├── OrderLine: Jordan 1 x1   → 재고 없음 → OUT_OF_STOCK 워크플로우 (8스텝)
> └── OrderLine: Dunk Low x3   → 재고 있음 → IN_STOCK 워크플로우 (6스텝)
> ```
> 대시보드에서는 Order 단위로 묶어서 보여주되, 각 라인의 워크플로우 진행 상태를 개별 표시.

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
  orderData         Json                // 주문 원본 데이터 (백업)

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
}

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

  // 워크플로우
  workflowId        String?             @unique
  workflow          OrderWorkflow?      @relation(fields: [workflowId], references: [id])

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([orderId])
  @@index([productGroupId])
}

enum OrderStatus {
  RECEIVED          // 주문 수신
  PROCESSING        // 워크플로우 진행 중
  PARTIALLY_DONE    // 일부 라인 완료
  COMPLETED         // 전체 완료
  CANCELLED         // 취소
}

model OrderWorkflow {
  id                String              @id @default(cuid())

  // 연결 (OrderLine에서 참조)
  orderLine         OrderLine?

  // 워크플로우 상태
  workflowType      WorkflowType        // IN_STOCK, OUT_OF_STOCK
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

model WorkflowStep {
  id                String              @id @default(cuid())

  // 연결
  workflowId        String
  workflow          OrderWorkflow       @relation(fields: [workflowId], references: [id])

  // 스텝 정보
  stepNumber        Int
  name              String              // "주문 자동 수집", "출고 처리 클릭"
  description       String?
  type              StepType            // AUTO, MANUAL

  // 상태
  status            StepStatus          @default(PENDING)
  startedAt         DateTime?
  completedAt       DateTime?
  completedBy       String?             // 수동 스텝: 처리한 사용자

  // 알림
  notifiedAt        DateTime?           // 수동 스텝: 알림 발송 시각
  notifyChannels    String[]            // ["email", "slack"]

  // 데이터
  inputData         Json?               // 이전 스텝에서 넘어온 데이터
  outputData        Json?               // 이 스텝의 처리 결과
  errorMessage      String?

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@unique([workflowId, stepNumber])
  @@index([status])
}

enum WorkflowType {
  IN_STOCK          // CASE 1: 재고 있음
  OUT_OF_STOCK      // CASE 2: 재고 없음
}

enum WorkflowStatus {
  STARTED           // 워크플로우 시작됨
  WAITING_MANUAL    // 수동 스텝 대기 중
  IN_PROGRESS       // 처리 중
  COMPLETED         // 모든 스텝 완료
  CANCELLED         // 주문 취소 등으로 중단
  FAILED            // 시스템 오류
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

#### 워크플로우 실행 엔진
```typescript
// 워크플로우 실행 핵심 로직
async function executeWorkflow(workflowId: string) {
  const workflow = await getWorkflowWithSteps(workflowId);

  for (const step of workflow.steps) {
    if (step.status === 'COMPLETED') continue;

    if (step.type === 'AUTO') {
      // 🟢 자동 스텝: 즉시 실행
      await executeAutoStep(workflow, step);
      // → 다음 스텝으로 계속
    }

    if (step.type === 'MANUAL') {
      // 🟠 수동 스텝: 일시정지 + 알림
      await pauseAndNotify(workflow, step);
      // → 여기서 함수 종료. 사용자 액션 후 재개
      return;
    }
  }

  // 모든 스텝 완료
  await completeWorkflow(workflowId);
}

// 수동 스텝 완료 시 호출 (대시보드 버튼 클릭)
async function completeManualStep(
  workflowId: string,
  stepNumber: number,
  userId: string,
  data?: any
) {
  await markStepCompleted(workflowId, stepNumber, userId, data);
  // 다음 스텝부터 이어서 실행
  await executeWorkflow(workflowId);
}
```

#### 동시성 제어 전략 (Race Condition 방지)

> [!danger] 핵심 위험: 동시 주문 → 이중 예약
> 스토어 A와 스토어 B에서 같은 상품 주문이 동시에 들어오면, 둘 다 같은 InventoryItem을 AVAILABLE로 읽고 RESERVED로 바꾸려 할 수 있다. **DB 트랜잭션 + 행 잠금** 없이는 내부 이중 예약 발생.
> (참고: Shopify 쪽에서는 재고 수량을 관리하지 않으므로, Shopify 레벨의 품절 차단은 별도 구현 필요 — 현재 범위 밖)

**1. 재고 예약/차감 시: Prisma $transaction + SELECT FOR UPDATE**
```typescript
async function checkAndReserveInventory(lineItems: LineItem[]) {
  return await prisma.$transaction(async (tx) => {
    const results = [];

    for (const item of lineItems) {
      // ProductGroup 기반 크로스 스토어 조회
      const product = await tx.product.findFirst({
        where: { shopifyVariantId: String(item.variant_id), shopifyStoreId: storeId }
      });

      // ⭐ FOR UPDATE: 다른 트랜잭션이 같은 행을 읽지 못하게 잠금
      const availableItems = await tx.$queryRaw`
        SELECT * FROM "InventoryItem"
        WHERE "productId" IN (
          SELECT id FROM "Product" WHERE "productGroupId" = ${product.productGroupId}
        )
        AND status = 'AVAILABLE'
        LIMIT ${item.quantity}
        FOR UPDATE
      `;

      if (availableItems.length < item.quantity) {
        results.push({ ...item, hasShortage: true, available: availableItems.length });
      } else {
        // 예약 처리
        for (const inv of availableItems) {
          await tx.inventoryItem.update({
            where: { id: inv.id },
            data: { status: 'RESERVED' }
          });
        }
        results.push({ ...item, hasShortage: false, reserved: availableItems });
      }
    }

    return { results, hasShortage: results.some(r => r.hasShortage) };
  }, {
    isolationLevel: 'Serializable',  // 가장 강력한 격리 수준
    timeout: 10000,                   // 10초 타임아웃
  });
}
```

**2. Webhook 중복 처리: idempotencyKey (Phase 1에서 구현)**
```
idempotencyKey = `${topic}:${shopDomain}:${shopifyId}`
// 예: "orders/create:bdj-main.myshopify.com:820982911946154508"
```

**3. DB 큐 Worker 중복 실행 방지:**
```typescript
// Cron이 동시에 여러 번 실행되지 않도록 잠금
async function processWebhookQueue() {
  // Advisory Lock으로 동시 실행 방지
  const acquired = await prisma.$queryRaw`SELECT pg_try_advisory_lock(1)`;
  if (!acquired[0].pg_try_advisory_lock) return; // 이미 다른 Worker 실행 중

  try {
    const events = await prisma.webhookEvent.findMany({
      where: { status: 'RECEIVED' },
      orderBy: { receivedAt: 'asc' },
      take: 50,
    });

    for (const event of events) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSING' }
      });
      // 처리 로직...
    }
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(1)`;
  }
}
```

> [!tip] 동시성 제어 3계층 요약
> | 계층 | 방법 | 보호 대상 |
> |------|------|----------|
> | 재고 예약/차감 | `$transaction` + `FOR UPDATE` | InventoryItem 이중 예약 |
> | 웹훅 수신 | idempotencyKey unique 제약 | 같은 이벤트 중복 처리 |
> | DB 큐 Worker | Advisory Lock | Worker 중복 실행 |

#### 자동 스텝 핸들러
```typescript
const autoStepHandlers: Record<string, AutoStepHandler> = {
  // CASE 1 & 2 공통
  'order_collect': async (workflow, step) => {
    // 웹훅 데이터에서 주문 정보 추출 (Phase 1에서 이미 저장됨)
    const order = workflow.orderData;
    return { lineItems: order.line_items, orderNumber: order.order_number };
  },

  'inventory_check_reserve': async (workflow, step) => {
    // ⭐ ProductGroup 기반 크로스 스토어 재고 조회
    // 1. line_items의 variant_id → Product 조회
    // 2. Product.productGroupId → ProductGroup 내 모든 Product 조회
    // 3. 해당 Product들의 InventoryItem (status: AVAILABLE) 조회
    // → 어느 몰에 등록된 재고든 찾을 수 있음
    const results = await checkAndReserveInventory(workflow.orderData.line_items);
    if (results.hasShortage) {
      await updateWorkflowType(workflow.id, 'OUT_OF_STOCK');
    }
    return results;
  },

  'inventory_deduct': async (workflow, step) => {
    // 재고 차감 (BDJ DB 내부만)
    // ⭐ RESERVED → SOLD 상태 변경
    // 참고: Shopify 스토어에서는 현재 재고 수량을 관리하지 않으므로 동기화 불필요
    await deductInventory(step.inputData.reservations);
    return { deducted: true };
  },

  // CASE 2 전용
  'vendor_match_alert': async (workflow, step) => {
    // 벤더 자동 매칭 + 발주 필요 알림
    const vendor = await matchVendor(step.inputData.shortageItems);
    return { vendor, suggestedOrder: buildPurchaseOrder(vendor, step.inputData) };
  },

  'customer_notify': async (workflow, step) => {
    // 고객 자동 알림
    const message = step.inputData.template; // "상품 준비 중" or "발송 완료"
    await sendCustomerNotification(workflow.orderData.email, message);
    return { notified: true };
  },

  'barcode_order_match': async (workflow, step) => {
    // 바코드 스캔 데이터 → 대기 주문 자동 매칭
    const matchedOrder = await matchPendingOrder(step.inputData.barcode);
    return { matchedOrder };
  },
};
```

#### 알림 시스템
```typescript
async function pauseAndNotify(
  workflow: OrderWorkflow,
  step: WorkflowStep
) {
  // 워크플로우 상태 업데이트
  await updateWorkflow(workflow.id, {
    status: 'WAITING_MANUAL',
    currentStep: step.stepNumber,
  });

  // 스텝 상태 업데이트
  await updateStep(step.id, { status: 'WAITING' });

  // 알림 발송
  for (const channel of step.notifyChannels) {
    switch (channel) {
      case 'email':
        await sendEmail({
          subject: `[${workflow.orderNumber}] ${step.name} - 처리 필요`,
          body: buildStepEmailBody(workflow, step),
          actionUrl: `${APP_URL}/workflows/${workflow.id}`,
        });
        break;

      case 'slack':
        await sendSlack({
          channel: '#orders',
          text: `📋 *${step.name}* 처리 필요\n주문: ${workflow.orderNumber}\n<${APP_URL}/workflows/${workflow.id}|대시보드에서 처리>`,
        });
        break;
    }
  }

  await updateStep(step.id, { notifiedAt: new Date() });
}
```

### 워크플로우 템플릿 정의
```typescript
// CASE 1: 재고 있는 경우
const IN_STOCK_TEMPLATE: StepTemplate[] = [
  { stepNumber: 1, name: '주문 자동 수집 (웹훅)',           type: 'AUTO',   handler: 'order_collect' },
  { stepNumber: 2, name: '재고 자동 확인 + 예약',          type: 'AUTO',   handler: 'inventory_check_reserve' },
  { stepNumber: 3, name: '통합 대시보드에서 확인',          type: 'MANUAL', notify: ['email', 'slack'] },
  { stepNumber: 4, name: '출고 처리 클릭',                 type: 'MANUAL', notify: ['slack'] },
  { stepNumber: 5, name: '재고 자동 차감 (BDJ DB)',         type: 'AUTO',   handler: 'inventory_deduct' },
  { stepNumber: 6, name: '배송 처리 + 송장 입력',          type: 'MANUAL', notify: ['email', 'slack'] },
];

// CASE 2: 재고 없는 경우
const OUT_OF_STOCK_TEMPLATE: StepTemplate[] = [
  { stepNumber: 1, name: '주문 자동 수집 → 재고 부족 감지',  type: 'AUTO',   handler: 'order_collect' },
  { stepNumber: 2, name: '⚠️ 발주 필요 알림 (벤더 자동 매칭)', type: 'AUTO', handler: 'vendor_match_alert' },
  { stepNumber: 3, name: '발주 버튼 클릭',                   type: 'MANUAL', notify: ['email', 'slack'] },
  { stepNumber: 4, name: '고객 자동 알림: "상품 준비 중"',    type: 'AUTO',   handler: 'customer_notify' },
  // --- 며칠 후 물건 도착 ---
  { stepNumber: 5, name: '바코드 스캔 → 대기 주문 자동 매칭', type: 'MANUAL', notify: ['email', 'slack'] },
  { stepNumber: 6, name: '입고 확인 + 출고 클릭',            type: 'MANUAL', notify: ['slack'] },
  { stepNumber: 7, name: '배송 처리 + 송장 입력',            type: 'MANUAL', notify: ['email', 'slack'] },
  { stepNumber: 8, name: '고객 자동 알림: "발송 완료"',       type: 'AUTO',   handler: 'customer_notify' },
];
```

### Phase 1 핸들러 → Phase 2 교체
```typescript
// Phase 1: 로그만 찍던 핸들러
// Phase 2: Order → OrderLine → 개별 Workflow 생성으로 교체

const handlers: Record<string, WebhookHandler> = {
  'orders/create': async (event) => {
    // 1. Order 레코드 생성
    const order = await createOrder({
      webhookEventId: event.id,
      shopifyStoreId: event.shopifyStoreId,
      shopifyOrderId: String(event.payload.id),
      orderNumber: String(event.payload.order_number),
      customerEmail: event.payload.email,
      orderData: event.payload,
    });

    // 2. 각 line_item → OrderLine 생성 + ProductGroup 매칭
    for (const item of event.payload.line_items) {
      const product = await findProductByVariant(item.variant_id, event.shopifyStoreId);
      const orderLine = await createOrderLine({
        orderId: order.id,
        shopifyLineItemId: String(item.id),
        shopifyProductId: String(item.product_id),
        shopifyVariantId: String(item.variant_id),
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        productGroupId: product?.productGroupId,
      });

      // 3. ⭐ 각 OrderLine 별로 재고 확인 → 워크플로우 타입 결정
      const hasStock = await checkInventoryForLine(orderLine);
      const workflowType = hasStock ? 'IN_STOCK' : 'OUT_OF_STOCK';
      const template = hasStock ? IN_STOCK_TEMPLATE : OUT_OF_STOCK_TEMPLATE;

      // 4. OrderLine별 개별 워크플로우 생성
      const workflow = await createWorkflowWithSteps({
        workflowType,
        steps: template,
      });
      await linkWorkflowToOrderLine(orderLine.id, workflow.id);

      // 5. 워크플로우 실행 시작
      await executeWorkflow(workflow.id);
    }

    // 6. Order 상태 업데이트
    await updateOrderStatus(order.id, 'PROCESSING');
  },

  'orders/cancelled': async (event) => {
    // Order 찾기 → 모든 OrderLine의 워크플로우 취소
    const order = await findOrderByShopifyId(event.payload.id, event.shopifyStoreId);
    if (order) {
      for (const line of order.lines) {
        if (line.workflow && line.workflow.status !== 'COMPLETED') {
          await cancelWorkflow(line.workflow.id);
          await restoreReservedInventory(line.workflow.id);
        }
      }
      await updateOrderStatus(order.id, 'CANCELLED');
    }
  },

  'products/update': async (event) => {
    // Product 동기화
    await syncProductFromShopify(event.payload);
  },
};
```

### 대시보드 워크플로우 뷰
```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 주문 워크플로우                                     [필터] [검색] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ⏳ 처리 대기 (3)                                                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🟠 #1052  BDJ Main   재고있음   Step 4/6: 출고 처리 클릭     │  │
│  │    Air Max 90 x2     10분 전 도착     [출고 처리] [상세보기]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 🟠 #503   BDJ Korea  재고없음   Step 3/8: 발주 버튼 클릭     │  │
│  │    Jordan 1 x1       벤더: Nike Korea  [발주하기] [상세보기]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ 🟠 #2201  BDJ Outlet 재고있음   Step 6/6: 배송 처리          │  │
│  │    Dunk Low x3       송장 입력 필요    [배송처리] [상세보기]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ✅ 최근 완료 (12)                                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ✅ #1051  BDJ Main   재고있음   6/6 완료   소요: 4분         │  │
│  │ ✅ #1050  BDJ Main   재고없음   8/8 완료   소요: 2일 3시간   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [스텝 클릭 → 워크플로우 타임라인 상세 보기]                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 체크리스트

| # | 작업 | 타입 | 의존성 |
|---|------|------|--------|
| 1 | Phase 1 전환 기준 모두 통과 확인 | QA | Phase 1 |
| 2 | OrderWorkflow / WorkflowStep 스키마 생성 | DB | — |
| 3 | 워크플로우 템플릿 정의 (IN_STOCK, OUT_OF_STOCK) | Logic | — |
| 4 | 워크플로우 실행 엔진 (자동/수동 분기) | Core | #3 |
| 5 | 자동 스텝 핸들러 구현 | Logic | #4 |
| 6 | 알림 시스템 (이메일 + Slack) | Infra | #4 |
| 7 | Phase 1 핸들러 → Phase 2 교체 | Integration | #4, #5 |
| 8 | 재고 확인/예약/차감 로직 | Logic | #5 |
| 9 | 벤더 매칭 + 발주 알림 (CASE 2) | Logic | #5 |
| 11 | 고객 알림 (상품 준비 중 / 발송 완료) | Logic | #6 |
| 12 | 대시보드 워크플로우 뷰 | UI | #4 |
| 13 | 수동 스텝 완료 API (버튼 클릭 처리) | API | #4 |
| 14 | 워크플로우 취소 로직 (orders/cancelled) | Logic | #7 |
| 15 | E2E 테스트: CASE 1 전체 흐름 | Test | All |
| 16 | E2E 테스트: CASE 2 전체 흐름 | Test | All |

## 핵심 인사이트

- **이 시스템의 꽃은 자동/수동 분기 워크플로우** — 자동 스텝은 연쇄 실행, 수동 스텝에서 멈추고 알림
- **OrderLine 단위 워크플로우** — 혼합 재고 주문 대응. 같은 주문 안에서 Air Max(재고 있음)는 IN_STOCK, Jordan(재고 없음)는 OUT_OF_STOCK 워크플로우를 독립 실행
- **재고 유무로 워크플로우 타입 자동 결정** — IN_STOCK(6스텝) vs OUT_OF_STOCK(8스텝)
- **월간 55시간 절약** — 하루 10건 주문 기준, 7일 근무시간에 해당
- **내부 이중 예약 방지** — DB 트랜잭션 + 행 잠금으로 동시 주문 시 같은 재고를 이중 예약하는 것을 방지
- **ProductGroup 기반 크로스 스토어 조회** — Phase 0-1의 ProductGroup으로 어느 몰 주문이든 전체 재고에서 검색·차감 가능

> [!info] Shopify 재고 동기화는 현재 범위 밖
> 현재 Shopify 스토어에서는 재고 수량을 관리하지 않음 (주문만 접수). 따라서 BDJ Inventory DB 내에서만 재고를 차감하며, Shopify 쪽으로 재고 수량을 푸시하지 않는다. 향후 Shopify 스토어에서 품절 표시를 자동으로 하고 싶다면, Shopify Inventory API를 통한 재고 동기화를 추가 구현할 수 있다.
- **Phase 1 위에 얹는 구조** — 웹훅 수신/검증은 건드리지 않고 핸들러만 교체

## 관련 노트

- [[Phase 1 - Shopify Webhook 구현 및 테스트]]
- [[BDJ Inventory - Overview]]
- [[Shopify API Integration]]
- [[Prisma Schema Design]]
- [[Notification System - Email and Slack]]

---

## 🌐 English Summary

Phase 2 builds an **order workflow engine** on top of Phase 1's validated webhook pipeline. When an `orders/create` webhook arrives, the system checks inventory and auto-creates either an IN_STOCK (6 steps) or OUT_OF_STOCK (8 steps) workflow. Auto steps (order collection, inventory reservation, inventory deduction, customer notifications) execute instantly in sequence. Note: Shopify stores do not currently track inventory quantities, so there is no cross-store sync — inventory is managed solely within the BDJ Inventory DB. Manual steps (dashboard review, fulfillment click, shipping label entry) pause the workflow and send notifications via email and Slack. The user completes manual steps from the dashboard, which resumes auto execution. This achieves 69% time savings for in-stock orders (16min→5min) and 83% for out-of-stock orders (35min→6min), totaling ~55 hours/month saved for 10 daily orders.