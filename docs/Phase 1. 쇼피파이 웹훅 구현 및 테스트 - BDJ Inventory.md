---
created: 2026-02-05
tags:
  - Shopify
  - Webhook
  - Inventory
  - Phase1
  - Architecture
source_url:
source_type: Other
channel: "[[BDJ Inventory]]"
status: Summarized
---

# Phase 1: Shopify Webhook 구현 및 테스트

> [!tldr] 💡 핵심 한 줄
> 4개 몰을 **단일 엔드포인트**로 수신하고, Shop Domain 라우팅 + HMAC 검증 + 5초 룰 비동기 처리 패턴으로 안정적인 Webhook 파이프라인을 Phase 2 통합 전에 독립 검증한다.
> 
> Validate a single-endpoint webhook pipeline for 4 Shopify stores with domain-based routing, HMAC verification, and async processing (5-second rule) before Phase 2 business logic integration.

## 핵심 요약

Phase 2에서 주문→재고 차감, 상품 변경→동기화 등 비즈니스 로직을 통합하기 전에, Webhook 수신·파싱·검증·재시도 처리를 **독립적으로** 구현하고 테스트한다. 단일 엔드포인트(`POST /api/webhooks/shopify`)로 4개 몰 전체를 받으며, `X-Shopify-Shop-Domain` 헤더로 몰을 식별한다.

## 주요 내용

### 왜 별도 Phase인가?
```
Phase 1: Webhook만 단독 테스트
  - 수신 가능한가?
  - 데이터 파싱 되는가?
  - HMAC 검증 되는가?
  - 재시도/실패 처리 되는가?
         │
         ▼ 검증 완료
Phase 2: 실제 비즈니스 로직 통합
  - 주문 → 인벤토리 자동 차감
  - 상품 변경 → Product 동기화
```

### 최선의 전략: 단일 엔드포인트 + Shop Domain 라우팅

몰마다 별도 엔드포인트를 만들면 코드 중복과 유지보수 비용만 늘어난다. **하나의 엔드포인트**로 4개 몰 전부 받는 방식이 최선이다.

**처리 흐름:**
`X-Shopify-Shop-Domain` 헤더로 몰 식별 → 해당 몰의 `webhookSecret`으로 HMAC 검증 → `idempotencyKey`로 중복 필터링 → 즉시 200 OK 응답 → 비동기로 실제 처리

### 구독할 Webhook Topics

| Topic | 이벤트 | 용도 | 우선순위 |
|-------|--------|------|---------|
| `orders/create` | 주문 생성 | 재고 예약/차감 | **P0** |
| `orders/cancelled` | 주문 취소 | 재고 복원 | **P0** |
| `orders/paid` | 결제 완료 | 결제 확인 | P1 |
| `orders/fulfilled` | 배송 완료 | 출고 상태 업데이트 | P1 |
| `products/update` | 상품 수정 | Product 동기화 | P1 |
| `products/create` | 상품 생성 | 신규 Product 추가 | P2 |
| `products/delete` | 상품 삭제 | Product 비활성화 | P2 |

> [!important] P0 우선 구현
> `orders/create`와 `orders/cancelled`만 먼저 구현하고 로그 저장까지 검증. 이 두 topic이 재고 차감/복원의 핵심이라 Phase 2 통합에 직접 연결된다. 나머지는 핸들러 구조만 잡아두고 로그만 찍으면 된다.

### 아키텍처
```
[Shopify Store 1~4]
        │
        │  POST /api/webhooks/shopify
        │  Headers: X-Shopify-Hmac-Sha256
        │           X-Shopify-Topic
        │           X-Shopify-Shop-Domain
        ▼
┌─────────────────────────────────┐
│  Webhook Endpoint               │
│  1. HMAC 검증                   │
│  2. 200 OK 즉시 응답 (5초 룰)   │
│  3. 비동기 처리 큐에 넣기       │
└────────────┬────────────────────┘
             ▼
┌─────────────────────────────────┐
│  WebhookEvent 테이블에 로그 저장 │
│  - topic, shop, payload         │
│  - status: RECEIVED             │
└────────────┬────────────────────┘
             ▼
┌─────────────────────────────────┐
│  비동기 처리 (Worker)           │
│  - 이벤트 타입별 핸들러         │
│  - 처리 완료 → PROCESSED       │
│  - 처리 실패 → FAILED + 재시도  │
└─────────────────────────────────┘
```

### 5초 룰 (핵심)

> [!warning] Shopify 5초 룰
> Webhook 수신 후 5초 내에 2xx 응답 안 하면 Shopify가 재시도함. 48시간 내 19회 재시도 후에도 실패하면 **Webhook 자체를 비활성화**시킨다. 따라서 **즉시 응답 → 비동기 처리** 패턴은 필수.

**Serverless 환경(Vercel) 주의:** API route에서 `await` 하지 않고 fire-and-forget으로 처리해야 하는데, Vercel은 응답 후 함수가 바로 종료될 수 있다.

**해결 방법 2가지:**
1. **DB 큐 패턴 (권장)** — WebhookEvent를 RECEIVED 상태로 저장만 하고, 별도 cron/worker가 주기적으로 RECEIVED 이벤트 처리. 인프라 추가 없이 현 단계에서 가장 현실적.
2. **메시지 큐** (BullMQ, SQS 등) — Phase 1에서는 과한 설계. 트래픽 늘면 그때 고려.

### HMAC 검증
```typescript
import crypto from 'crypto';

function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}
```

> [!tip] 몰별 Secret 분리
> 4개 몰이 각각 다른 webhook secret을 가짐. `ShopifyStore` 테이블에 `webhookSecret` 필드를 두고 domain으로 조회해서 검증. 하나의 shared secret을 쓰면 한 몰이 compromised됐을 때 전체가 위험.

### Webhook Payload 예시

**orders/create:**
```json
{
  "id": 820982911946154508,
  "order_number": 1001,
  "email": "customer@example.com",
  "financial_status": "paid",
  "fulfillment_status": null,
  "line_items": [
    {
      "id": 866550311766439020,
      "product_id": 7234567890,
      "variant_id": 4567890123,
      "sku": "AM90-BLK",
      "title": "Air Max 90 - Black",
      "quantity": 2,
      "price": "129.99"
    }
  ],
  "shipping_address": { "city": "Seoul", "country": "KR" },
  "created_at": "2026-02-05T10:30:00-05:00"
}
```

**products/update:**
```json
{
  "id": 7234567890,
  "title": "Air Max 90",
  "vendor": "Nike",
  "product_type": "Shoes",
  "status": "active",
  "variants": [
    {
      "id": 4567890123,
      "sku": "AM90-BLK",
      "barcode": "8801234567890",
      "price": "139.99",
      "inventory_quantity": 10
    }
  ],
  "updated_at": "2026-02-05T11:00:00-05:00"
}
```

### 스키마 설계

> [!note] 스키마 최종 기준: [[Schema Reference - BDJ Inventory]]
> 아래 스키마는 이 Phase에서 도입/변경된 모델의 요약이다. 전체 스키마는 Schema Reference 참고.

**WebhookEvent (신규):**
```prisma
model WebhookEvent {
  id              String              @id @default(cuid())
  shopifyStoreId  String
  shopifyStore    ShopifyStore        @relation(fields: [shopifyStoreId], references: [id])
  topic           String
  shopifyId       String
  payload         Json
  status          WebhookStatus       @default(RECEIVED)
  processedAt     DateTime?
  errorMessage    String?
  retryCount      Int                 @default(0)
  idempotencyKey  String              @unique
  receivedAt      DateTime            @default(now())
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  
  @@index([shopifyStoreId])
  @@index([topic])
  @@index([status])
  @@index([receivedAt])
}

enum WebhookStatus {
  RECEIVED
  PROCESSING
  PROCESSED
  FAILED
  SKIPPED
}
```

**ShopifyStore 수정 (webhookSecret 추가):**
```prisma
model ShopifyStore {
  id              String    @id @default(cuid())
  name            String
  domain          String    @unique
  accessToken     String
  webhookSecret   String?
  apiVersion      String    @default("2025-01")
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  products        Product[]
  webhookEvents   WebhookEvent[]
}
```

### 엔드포인트 설계
```
POST /api/webhooks/shopify
  1. X-Shopify-Shop-Domain → ShopifyStore 조회
  2. HMAC 검증 (store.webhookSecret 사용)
  3. 중복 체크 (idempotencyKey)
  4. WebhookEvent 저장 (status: RECEIVED)
  5. 200 OK 즉시 응답
  6. 비동기 처리 시작
```

**Topic별 핸들러 (Phase 1에서는 로그만):**
```typescript
const handlers: Record<string, WebhookHandler> = {
  'orders/create': async (event) => {
    console.log(`📦 New order #${event.payload.order_number}`);
    // Phase 2: 인벤토리 차감 로직
  },
  'orders/cancelled': async (event) => {
    console.log(`❌ Order cancelled #${event.payload.order_number}`);
    // Phase 2: 인벤토리 복원 로직
  },
  'products/update': async (event) => {
    console.log(`🔄 Product updated: ${event.payload.title}`);
    // Phase 2: Product 동기화 로직
  },
};
```

### Shopify 재시도 정책 대응
```
Shopify 재시도 스케줄:
  실패 → 5초 후 → 10분 후 → 30분 후 → 1시간 후
  ... 최대 19회, 48시간
  48시간 후에도 실패 → Webhook 자동 비활성화
```

**대응 전략:**
- 반드시 5초 내 200 OK 응답 (비동기 처리)
- `idempotencyKey`로 중복 수신 방지
- 자체 실패 시 `retryCount` 증가 + 재처리

### 테스트 전략

**1. 로컬 개발 (ngrok):**
```bash
ngrok http 3000
# Shopify Admin > Settings > Notifications > Webhooks
# URL: https://xxx.ngrok.io/api/webhooks/shopify
```

**2. Shopify CLI:**
```bash
shopify app webhook trigger \
  --topic orders/create \
  --address https://xxx.ngrok.io/api/webhooks/shopify
```

**3. 수동 cURL:**
```bash
curl -X POST http://localhost:3000/api/webhooks/shopify \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Shop-Domain: bdj-main.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: {computed_hmac}" \
  -d '{"id": 123, "order_number": 1001, "line_items": [...]}'
```

**4. 검증 항목:**

| # | 테스트 항목 | 예상 결과 |
|---|-----------|----------|
| 1 | 유효한 HMAC으로 요청 | 200 OK + WebhookEvent 생성 |
| 2 | 잘못된 HMAC으로 요청 | 401 Unauthorized |
| 3 | 없는 shop domain으로 요청 | 401 Unauthorized |
| 4 | 동일 이벤트 중복 수신 | SKIPPED 처리 |
| 5 | 5초 내 응답 확인 | 200 OK (body 처리 전 응답) |
| 6 | 4개 몰 각각 webhook 수신 | 각 몰별 WebhookEvent 생성 |
| 7 | orders/create payload 파싱 | line_items 정상 추출 |
| 8 | products/update payload 파싱 | variants 정상 추출 |
| 9 | 처리 실패 시 | FAILED + errorMessage 저장 |
| 10 | Shopify 재시도 수신 | 중복 체크 → SKIPPED |

### Webhook 모니터링 UI
```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Webhook Events                                              │
├─────────────────────────────────────────────────────────────────┤
│  [Store ▼] [Topic ▼] [Status ▼]                                │
│                                                                 │
│  │Status│ Topic          │ Shop       │ ID    │ Time    │      │
│  │ ✅   │ orders/create  │ BDJ Main   │ #1001 │ 방금    │      │
│  │ ✅   │ orders/create  │ BDJ Korea  │ #502  │ 2분전   │      │
│  │ ⏭️   │ orders/create  │ BDJ Main   │ #1001 │ 3분전   │      │
│  │      │ (중복 SKIPPED) │            │       │         │      │
│  │ ❌   │ products/update│ BDJ Outlet │ 78901 │ 5분전   │      │
│                                                                 │
│  [이벤트 클릭 → Payload JSON 상세 보기]                         │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1 → Phase 2 전환 기준

| 검증 항목 | 기준 | 상태 |
|----------|------|------|
| HMAC 검증 | 4개 몰 모두 통과 | ☐ |
| 수신 안정성 | 100건 연속 수신 성공 | ☐ |
| 중복 처리 | 중복 이벤트 정상 SKIPPED | ☐ |
| 5초 응답 | 모든 요청 5초 내 응답 | ☐ |
| 에러 핸들링 | 실패 시 FAILED 로깅 정상 | ☐ |
| Payload 파싱 | orders, products 모두 정상 | ☐ |
| 모니터링 | 로그 뷰어에서 실시간 확인 가능 | ☐ |

### 체크리스트

| # | 작업 | 타입 |
|---|------|------|
| 1 | WebhookEvent 스키마 생성 | DB |
| 2 | ShopifyStore에 webhookSecret 추가 | DB |
| 3 | POST /api/webhooks/shopify 엔드포인트 | API |
| 4 | HMAC 검증 미들웨어 | API |
| 5 | idempotencyKey 중복 체크 | API |
| 6 | Topic별 핸들러 구조 (로그만) | API |
| 7 | 비동기 처리 패턴 (5초 룰) | API |
| 8 | ngrok 로컬 테스트 환경 | Test |
| 9 | 4개 몰 Webhook 등록 | Config |
| 10 | 테스트 시나리오 10건 검증 | Test |
| 11 | Webhook 모니터링 로그 뷰어 | UI |
| 12 | Phase 2 전환 기준 체크리스트 검증 | QA |

### 운영 모니터링 전략

> [!warning] 모니터링 없으면 장애를 고객이 먼저 발견한다
> 웹훅 실패, 큐 적체, Stuck 워크플로우를 자동으로 감지하고 알림을 보내는 체계가 필수.

#### 모니터링 대시보드 (Vercel Analytics + 커스텀)

| 지표 | 쿼리 | 알림 기준 |
|------|------|----------|
| 큐 깊이 | `WebhookEvent WHERE status = 'RECEIVED'` count | > 100건 |
| 처리 실패율 | `FAILED / 전체` 비율 (최근 1시간) | > 5% |
| 평균 처리 시간 | `processedAt - receivedAt` 평균 | > 30초 |
| 5초 응답 위반 | API 응답 시간 > 5초 비율 | > 1% |
| Stuck 워크플로우 | `WorkflowStep WHERE status = 'WAITING' AND dueAt < now()` | > 0건 |
| 몰별 수신량 | `WebhookEvent GROUP BY shopifyStoreId` (최근 1시간) | 특정 몰 0건 (수신 중단 감지) |

#### 알림 채널

| 심각도 | 채널 | 예시 |
|--------|------|------|
| 🔴 Critical | Slack #alerts + 이메일 | 큐 100건 초과, 5초 위반 5% 초과, 몰 수신 중단 |
| 🟡 Warning | Slack #monitoring | 실패율 3% 초과, Stuck 워크플로우 감지 |
| 🟢 Info | 대시보드만 | 일일 처리량 요약, 평균 처리 시간 |

#### Cron 기반 헬스 체크

```typescript
// 매 5분마다 실행
async function healthCheck() {
  const queueDepth = await prisma.webhookEvent.count({ where: { status: 'RECEIVED' } });
  const failedRecent = await prisma.webhookEvent.count({
    where: { status: 'FAILED', updatedAt: { gte: oneHourAgo } }
  });
  const stuckSteps = await prisma.workflowStep.count({
    where: { status: 'WAITING', dueAt: { lt: new Date() } }
  });

  if (queueDepth > 100) await alertCritical('큐 적체', `${queueDepth}건 대기 중`);
  if (failedRecent > 10) await alertWarning('실패 급증', `최근 1시간 ${failedRecent}건 실패`);
  if (stuckSteps > 0) await alertWarning('Stuck 워크플로우', `${stuckSteps}건 마감 초과`);
}
```

## 핵심 인사이트

- **단일 엔드포인트 + Domain 라우팅**이 4개 몰 관리의 최선 — 몰별 엔드포인트는 코드 중복만 늘림
- **5초 룰은 선택이 아닌 필수** — 위반 시 Shopify가 48시간 후 Webhook 자동 비활성화
- **DB 큐 패턴**이 Vercel serverless 환경에서 가장 현실적인 비동기 처리 방법
- **몰별 Secret 분리** — shared secret은 한 몰 compromised 시 전체 위험
- **P0 우선 전략** — `orders/create` + `orders/cancelled`만 먼저 검증, 나머지는 로그만

## 관련 노트

- [[BDJ Inventory - Overview]]
- [[Shopify API Integration]]
- [[Phase 2 - Business Logic Integration]]
- [[Prisma Schema Design]]

---

## 🌐 English Summary

Phase 1 focuses on building and validating a standalone Shopify Webhook pipeline before integrating business logic in Phase 2. The key architecture decision is a **single endpoint** (`POST /api/webhooks/shopify`) handling all 4 stores, routing by `X-Shopify-Shop-Domain` header. Each store has its own `webhookSecret` for HMAC verification. The critical constraint is Shopify's **5-second rule** — respond with 200 OK immediately, then process asynchronously. For Vercel serverless, a **DB queue pattern** (save as RECEIVED, process via cron/worker) is the most practical approach. Priority is P0 topics (`orders/create`, `orders/cancelled`) first, with remaining topics logging-only until Phase 2.