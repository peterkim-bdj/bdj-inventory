# Feature Plan: sync-progress

## 1. Overview

| Item | Description |
|------|-------------|
| Feature Name | Sync Progress & Console View |
| Level | Dynamic |
| Priority | High |
| Estimated Scope | Medium (API + UI) |

## 2. Problem Statement

현재 Shopify 싱크 시 "Syncing..." 텍스트만 표시되어 사용자가 진행 상황을 전혀 알 수 없음.
- 싱크가 얼마나 걸릴지 예측 불가
- 어떤 제품이 처리되고 있는지 확인 불가
- 싱크 중 에러 발생 시 어디서 실패했는지 파악 어려움

## 3. Goals

1. **Progress Bar**: 총 제품 수 대비 현재 처리된 수를 실시간 프로그레스 바로 표시
2. **Console View**: 버튼 클릭으로 싱크 중인 제품 목록을 실시간으로 볼 수 있는 콘솔 뷰 제공
3. **Phase Display**: 현재 싱크 단계(Fetching → Processing → Completing) 표시

## 4. Proposed Solution

### 4.1 Architecture: Server-Sent Events (SSE)

현재 싱크는 단일 POST 요청으로 서버에서 전체 작업 완료 후 응답. 실시간 진행률을 위해 **SSE (Server-Sent Events)** 방식 채택.

**Why SSE over alternatives:**
- WebSocket: 양방향 불필요, 오버엔지니어링
- Polling: 불필요한 요청 다수 발생, 지연 있음
- SSE: 단방향 서버→클라이언트 스트리밍, HTTP 기반으로 단순, 자동 재연결 지원

### 4.2 Flow

```
[Client]                          [Server]
   |                                  |
   |-- POST /api/shops/[id]/sync ---> |  (싱크 시작, syncLogId 반환)
   |<-- { syncLogId } --------------- |
   |                                  |
   |-- GET /api/sync/[syncLogId]/     |  (SSE 연결)
   |       stream --------->          |
   |                                  |-- Shopify API 호출 (페이지별)
   |<-- event: progress ------------- |  { phase: 'fetching', fetched: 50, page: 1 }
   |<-- event: progress ------------- |  { phase: 'fetching', fetched: 100, page: 2 }
   |                                  |-- DB 저장 시작
   |<-- event: progress ------------- |  { phase: 'processing', processed: 1, total: 100, product: {...} }
   |<-- event: progress ------------- |  { phase: 'processing', processed: 2, total: 100, product: {...} }
   |                                  |  ...
   |<-- event: complete ------------- |  { summary: {...} }
   |                                  |
   |-- (SSE connection closed) ----   |
```

### 4.3 UI Components

#### A. SyncButton Enhancement
- 기존: "Syncing..." 텍스트
- 변경: 인라인 프로그레스 바 + 퍼센트 표시 (예: `▓▓▓▓░░░░ 45%`)
- 클릭 시 콘솔 뷰 모달/패널 열기

#### B. SyncConsole (New Component)
- 모달 또는 슬라이드 패널
- 상단: 프로그레스 바 + 현재 단계 + 숫자 (23/150 products)
- 중앙: 터미널 스타일 로그 뷰 (자동 스크롤)
  - `[10:23:45] Fetching page 1... (50 products)`
  - `[10:23:46] Processing: "Blue Dress - Size S" ✓`
  - `[10:23:46] Processing: "Red Shirt - Size M" ✓`
- 하단: 단계 표시 (Fetching → Processing → Completing)

#### C. Progress Event Types
```typescript
type SyncProgressEvent =
  | { phase: 'fetching'; fetched: number; page: number }
  | { phase: 'processing'; processed: number; total: number; product: { name: string; sku?: string } }
  | { phase: 'completing'; message: string }
  | { phase: 'complete'; summary: SyncSummary }
  | { phase: 'error'; error: string }
```

### 4.4 Implementation Approach

#### Backend Changes
1. **`startSync` 리팩토링**: 콜백 기반으로 변경, 각 단계에서 progress 이벤트 emit
2. **SSE 엔드포인트**: `GET /api/sync/[syncLogId]/stream` — ReadableStream으로 이벤트 전송
3. **SyncLog 실시간 업데이트**: 처리 중 progress를 DB에도 주기적 반영 (연결 끊김 대비)

#### Frontend Changes
1. **useSyncProgress hook**: SSE 연결 관리, progress state 관리
2. **SyncButton 수정**: 프로그레스 바 표시, 콘솔 뷰 열기 버튼
3. **SyncConsole component**: 모달 + 터미널 로그 + 프로그레스 바
4. **i18n**: sync 네임스페이스에 progress 관련 키 추가

## 5. Scope

### In Scope
- SSE 기반 실시간 프로그레스 스트리밍
- 프로그레스 바 UI (SyncButton 인라인 + SyncConsole 상세)
- 콘솔 뷰 (제품별 처리 상태 로그)
- Initial Sync + Resync(fetching 단계까지) 모두 지원
- i18n (EN/KO)

### Out of Scope
- Sync All 의 개별 shop별 progress (향후 확장)
- SSE 연결 끊김 시 자동 재연결 (기본 EventSource 재연결에 의존)
- Diff Apply 단계의 progress (별도 feature로)

## 6. Technical Considerations

- **SSE + Next.js App Router**: Route Handler에서 `ReadableStream` 반환으로 SSE 구현 가능
- **Shopify API pagination**: 페이지별 50개씩 fetch → 페이지 단위로 progress 이벤트 발생
- **DB processing**: 제품별 1건씩 처리 → 제품 단위로 progress 이벤트 발생
- **메모리**: SSE 연결당 서버 메모리 소비 최소화 (이벤트 전송 후 즉시 해제)
- **Vercel 제한**: Vercel Serverless Functions는 실행 시간 제한이 있음 (Pro: 60s, Hobby: 10s). Streaming Response로 timeout 연장 가능하나, 대량 제품의 경우 주의 필요

## 7. Dependencies

- 기존 syncService.ts 리팩토링
- EventSource API (브라우저 내장, 추가 패키지 불필요)
- 추가 npm 패키지 없음

## 8. Success Criteria

- [ ] 싱크 시작 시 프로그레스 바가 0%에서 100%까지 실시간 업데이트
- [ ] 콘솔 뷰에서 개별 제품 처리 상태 확인 가능
- [ ] 에러 발생 시 콘솔 뷰에서 에러 메시지 확인 가능
- [ ] 페이지 새로고침 후에도 진행 중인 싱크 상태 확인 가능 (SyncLog DB 기반)
- [ ] EN/KO 다국어 지원
