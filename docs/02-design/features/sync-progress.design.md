# Feature Design: sync-progress

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Client (Browser)                                            │
│                                                             │
│  SyncButton ──(click)──> POST /api/shops/[id]/sync          │
│      │                        │                             │
│      │                   returns { syncLogId }              │
│      │                        │                             │
│      ├── useSyncProgress(syncLogId)                         │
│      │       │                                              │
│      │       └── EventSource: GET /api/sync/[logId]/stream  │
│      │               │                                      │
│      │          receives SSE events                         │
│      │               │                                      │
│      ├── SyncButton: inline progress bar                    │
│      └── SyncConsole: modal with log view                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Server                                                      │
│                                                             │
│  POST /api/shops/[id]/sync                                  │
│    └── startSyncAsync(shopId) → returns syncLogId           │
│         └── background: syncWithProgress(shopId, syncLogId) │
│              ├── fetchAllProducts (page by page)            │
│              │    └── updates SyncLog.progress JSON         │
│              └── processProducts (one by one)               │
│                   └── updates SyncLog.progress JSON         │
│                                                             │
│  GET /api/sync/[syncLogId]/stream (SSE)                     │
│    └── polls SyncLog.progress every 500ms                   │
│        └── sends delta events to client                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Design Decision: DB Polling vs In-Memory Stream

SSE 엔드포인트가 직접 syncService 콜백을 받는 대신, **DB 기반 폴링** 방식 채택:
- **이유 1**: Vercel serverless 환경에서 두 개의 request handler가 메모리를 공유할 수 없음
- **이유 2**: 페이지 새로고침/재연결 시에도 현재 progress 확인 가능
- **이유 3**: 구현 단순성 — syncService는 DB에 progress 기록, SSE는 DB를 읽어서 전달

## 2. Database Changes

### SyncLog 모델 확장

```prisma
model SyncLog {
  // ... existing fields ...
  progress  Json?    // NEW: real-time progress data
}
```

**progress JSON 구조:**
```typescript
interface SyncProgress {
  phase: 'fetching' | 'processing' | 'completing' | 'complete' | 'error';
  // Fetching phase
  fetchedCount?: number;
  currentPage?: number;
  // Processing phase
  processedCount?: number;
  totalCount?: number;
  currentProduct?: { name: string; sku?: string };
  // Logs (최근 50개만 유지)
  logs?: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error';
  }>;
}
```

## 3. API Design

### 3.1 POST /api/shops/[id]/sync (Modified)

**변경점**: 동기 실행 → 비동기 실행. syncLogId를 즉시 반환하고 백그라운드에서 싱크 진행.

```typescript
// Response (즉시 반환)
{
  syncLogId: string;
  status: 'IN_PROGRESS';
}
```

**구현**: `startSync`를 `startSyncAsync`로 변경. Promise를 await하지 않고 fire-and-forget.

### 3.2 GET /api/sync/[syncLogId]/stream (New - SSE)

**SSE 이벤트 타입:**

```typescript
// Phase: fetching
event: progress
data: { "phase": "fetching", "fetchedCount": 50, "currentPage": 1 }

// Phase: processing
event: progress
data: { "phase": "processing", "processedCount": 23, "totalCount": 150, "currentProduct": { "name": "Blue Dress" } }

// Phase: complete
event: complete
data: { "phase": "complete", "summary": { "totalFetched": 150, "newCount": 150 } }

// Phase: error
event: error
data: { "phase": "error", "error": "Shopify API rate limit exceeded" }
```

**구현**:
- `ReadableStream` + `TextEncoder`로 SSE 구현
- 500ms 간격으로 `SyncLog.progress` 폴링
- phase가 `complete` 또는 `error`면 스트림 종료
- 최대 5분 타임아웃 (Vercel streaming 한계 대비)

### 3.3 GET /api/sync/[syncLogId]/progress (New - Fallback)

SSE 미지원 환경을 위한 일반 REST 폴링 엔드포인트.

```typescript
// Response
{
  phase: string;
  fetchedCount?: number;
  processedCount?: number;
  totalCount?: number;
  currentProduct?: { name: string; sku?: string };
  logs?: Array<{ timestamp: string; message: string; type: string }>;
}
```

## 4. Backend Implementation

### 4.1 syncService.ts 변경

```typescript
// 새 함수: 비동기 싱크 시작
export async function startSyncAsync(shopId: string): Promise<string> {
  // 기존 validation (shop 존재, IN_PROGRESS 체크)
  // SyncLog 생성
  // shop status → IN_PROGRESS
  // 반환: syncLogId

  // Fire-and-forget: 실제 싱크 작업
  syncWithProgress(shopId, syncLogId).catch(async (error) => {
    // 에러 처리: SyncLog 업데이트
  });

  return syncLogId;
}

// 새 함수: progress 콜백이 포함된 싱크
async function syncWithProgress(shopId: string, syncLogId: string) {
  // 1. Fetching phase
  //    - fetchAllProducts를 페이지별 콜백으로 변경
  //    - 페이지 완료마다 SyncLog.progress 업데이트

  // 2. Processing phase
  //    - 제품별 처리 시 SyncLog.progress 업데이트
  //    - 10개마다 batch update (DB 부하 줄이기)

  // 3. Completing phase
  //    - SyncLog status → COMPLETED
}

// progress 업데이트 헬퍼
async function updateProgress(syncLogId: string, progress: SyncProgress) {
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: { progress: progress as any },
  });
}
```

### 4.2 Shopify client.ts 변경

```typescript
// fetchAllProducts에 onPage 콜백 추가
export async function fetchAllProducts(
  config: ShopifyConfig,
  onPage?: (pageInfo: { page: number; count: number }) => void
): Promise<ShopifyProduct[]> {
  // 기존 로직 유지
  // 페이지 완료 시 onPage 콜백 호출
}
```

## 5. Frontend Implementation

### 5.1 useSyncProgress Hook

```typescript
// src/features/shops/hooks/useSyncProgress.ts

interface SyncProgressState {
  phase: 'idle' | 'fetching' | 'processing' | 'completing' | 'complete' | 'error';
  fetchedCount: number;
  processedCount: number;
  totalCount: number;
  currentProduct?: { name: string; sku?: string };
  logs: Array<{ timestamp: string; message: string; type: string }>;
  percentage: number; // computed: 0-100
  error?: string;
}

function useSyncProgress(syncLogId: string | null): SyncProgressState {
  // EventSource 연결 관리
  // 이벤트 수신 → state 업데이트
  // cleanup on unmount
  // 자동 재연결 (EventSource 내장)
}
```

### 5.2 SyncButton 수정

```
상태별 렌더링:
─────────────────────────────────────────
[NEVER/SYNCED/FAILED]
  ┌──────────┐
  │  ↻ Sync  │    기존과 동일
  └──────────┘

[IN_PROGRESS] - 프로그레스 바 표시
  ┌───────────────────────────┐
  │  ▓▓▓▓▓▓░░░░ 62%  [📋]   │    📋 = Console 열기 버튼
  └───────────────────────────┘

[DIFF_REVIEW]
  ┌──────────────┐
  │  Review Diff │    기존과 동일
  └──────────────┘
─────────────────────────────────────────
```

### 5.3 SyncConsole Component

```
┌────────────────────────────────────────────────────────────┐
│ ✕  Sync Progress - Sokim New York                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Phase: Processing Products                                │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  62%  (93/150)            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Console                                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ [16:23:45] Fetching page 1... (50 products)        ℹ️  │ │
│ │ [16:23:46] Fetching page 2... (100 products)       ℹ️  │ │
│ │ [16:23:47] Fetching page 3... (150 products)       ℹ️  │ │
│ │ [16:23:47] Fetch complete. Processing 150 products ✅  │ │
│ │ [16:23:48] "Blue Dress - Size S" (SKU: BD-001)     ✅  │ │
│ │ [16:23:48] "Blue Dress - Size M" (SKU: BD-002)     ✅  │ │
│ │ [16:23:48] "Red Shirt - Size L" (SKU: RS-003)      ✅  │ │
│ │ [16:23:49] "Black Pants - 32" (SKU: BP-004)        ✅  │ │
│ │ ▌ (auto-scroll)                                        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│  ● Fetching ─── ● Processing ─── ○ Complete               │
└────────────────────────────────────────────────────────────┘
```

**구현 상세:**
- 모달 (Dialog) 방식 — 기존 shadcn/ui Dialog 활용
- 콘솔 로그: `overflow-y-auto`, `max-h-[400px]`, monospace font
- 자동 스크롤: `scrollIntoView` on new log entry
- 단계 표시: 3-step stepper (Fetching → Processing → Complete)
- 닫아도 싱크 계속 진행 (SSE 연결만 끊김, 재오픈 시 재연결)

### 5.4 State Management

```typescript
// SyncButton에서 syncLogId를 관리
// syncLogId가 있으면 useSyncProgress 활성화
// complete/error 시 syncLogId 초기화 + shops 쿼리 invalidate

// SyncConsole open/close state는 SyncButton 내부에서 관리
// zustand 불필요 (컴포넌트 로컬 상태로 충분)
```

## 6. File Structure

```
src/features/shops/
  hooks/
    useSync.ts              # Modified: startSyncAsync 호출
    useSyncProgress.ts      # NEW: SSE 연결 + progress state
  components/
    SyncButton.tsx          # Modified: progress bar + console toggle
    SyncConsole.tsx         # NEW: modal with progress + log view
    SyncProgressBar.tsx     # NEW: reusable progress bar
    SyncStepper.tsx         # NEW: phase stepper (3 steps)

src/app/api/
  sync/[syncLogId]/
    stream/route.ts         # NEW: SSE endpoint
    progress/route.ts       # NEW: REST fallback

src/messages/en/sync.json   # Modified: progress keys added
src/messages/ko/sync.json   # Modified: progress keys added

prisma/schema.prisma        # Modified: SyncLog.progress field
```

## 7. i18n Keys

```json
{
  "progress": {
    "title": "Sync Progress",
    "phase": {
      "fetching": "Fetching from Shopify",
      "processing": "Processing Products",
      "completing": "Completing Sync",
      "complete": "Sync Complete",
      "error": "Sync Failed"
    },
    "stats": "{processed} / {total} products",
    "percentage": "{value}%",
    "console": "Console",
    "openConsole": "View Details",
    "log": {
      "fetchingPage": "Fetching page {page}... ({count} products)",
      "fetchComplete": "Fetch complete. Processing {count} products",
      "processingProduct": "\"{name}\"",
      "syncComplete": "Sync completed successfully",
      "syncFailed": "Sync failed: {error}"
    },
    "stepper": {
      "fetching": "Fetching",
      "processing": "Processing",
      "complete": "Complete"
    }
  }
}
```

## 8. Implementation Order

1. **DB**: Prisma schema에 `progress` 필드 추가 + `prisma db push`
2. **Backend - syncService**: `startSyncAsync` + `syncWithProgress` + `updateProgress`
3. **Backend - Shopify client**: `onPage` 콜백 추가
4. **Backend - SSE endpoint**: `/api/sync/[syncLogId]/stream`
5. **Backend - REST fallback**: `/api/sync/[syncLogId]/progress`
6. **Frontend - hook**: `useSyncProgress`
7. **Frontend - components**: `SyncProgressBar`, `SyncStepper`, `SyncConsole`
8. **Frontend - SyncButton**: 수정 (progress bar + console toggle)
9. **Frontend - useSync hook**: `startSyncAsync` 호출로 변경
10. **i18n**: EN/KO 키 추가
