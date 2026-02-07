# Phase 0-1: Shop 관리 & Product 초기 데이터 구축 - Planning Document

> **Summary**: Shop CRUD + Shopify Sync(Diff Review) + ProductGroup 크로스 스토어 매핑으로 BDJ Inventory의 상품 데이터 기반을 구축한다.
>
> **Project**: BDJ Inventory
> **Author**: BDJ Team
> **Date**: 2026-02-06
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

BDJ Inventory 시스템의 **데이터 기반**을 구축한다. 4개 Shopify 몰의 상품 데이터를 DB에 가져오고, 크로스 스토어 상품 매핑(ProductGroup)을 통해 이후 Phase(재고 관리, 주문 워크플로우)의 토대를 만든다.

### 1.2 Background

- 현재 4개 Shopify 몰을 각각 관리하여 재고 파악이 어렵고 중복 작업 발생
- 같은 실물 상품이 여러 몰에 별도로 등록되어 있어 통합 재고 조회 불가
- Shopify 데이터 변경 시 수동으로 확인하고 반영해야 함
- 이 Phase가 완료되어야 Phase 0-2(재고 등록), Phase 1(Webhook), Phase 2(워크플로우)가 가능

### 1.3 Related Documents

- Design: [Phase 0-1. Product 초기 데이터 구축 - BDJ Inventory](../../Phase%200-1.%20%20Product%20초기%20데이터%20구축%20-%20BDJ%20Inventory.md)
- Schema: [Schema Reference - BDJ Inventory](../../Schema%20Reference%20-%20BDJ%20Inventory.md)
- Prerequisite: [i18n (Internationalization) Planning Document](./i18n.plan.md)
- Dependency: [Phase 0-2. Inventory 초기 데이터 구축](../../Phase%200-2.%20Inventory%20초기%20데이터%20구축%20-%20BDJ%20Inventory.md)

---

## 2. Scope

### 2.1 In Scope

- [ ] ShopifyStore CRUD (Shop 등록/수정/삭제/목록)
- [ ] Shopify GraphQL API 연동 (Products Fetch + Pagination)
- [ ] 첫 동기화 (Initial Sync) - 전체 Import + Vendor Upsert
- [ ] 재동기화 (Re-Sync) - Diff Review (NEW/MODIFIED/REMOVED/UNCHANGED)
- [ ] Diff Review UI - 요약 대시보드 + 탭별 상세 + 항목별 승인/거부
- [ ] ProductGroup 자동 매핑 (SKU/바코드 기준)
- [ ] Product View UI (리스트/카드 뷰, 필터, 검색, 정렬)
- [ ] Vendor 테이블 생성 (Sync 시 이름만 자동 저장)
- [ ] SyncLog 이력 관리
- [ ] 전체 동기화 (모든 활성 몰 순차 처리)

### 2.2 Out of Scope

- Webhook 수신 (Phase 1)
- 주문 처리 워크플로우 (Phase 2)
- 재고 등록 / 바코드 스캔 (Phase 0-2)
- Vendor 연락처 입력 / 시트 Import (Phase 0-3)
- ProductGroup 수동 매핑 Admin UI (Phase 0-1 이후)
- Shopify 쪽으로 재고 Push (현재 범위 밖)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Shop 추가 (이름, 도메인, Access Token, API 버전) | High | Pending |
| FR-02 | Shop 목록 (상태, 상품 수, 마지막 동기화 표시) | High | Pending |
| FR-03 | Shop 수정 (이름, Token, 버전 변경) | Medium | Pending |
| FR-04 | Shop 삭제 (Soft Delete + 연관 Product 비활성화) | Medium | Pending |
| FR-05 | 개별 Shop 동기화 (Initial Sync) | High | Pending |
| FR-06 | 재동기화 + Diff 생성 (NEW/MODIFIED/REMOVED/UNCHANGED) | High | Pending |
| FR-07 | Diff Review UI (탭별 표시, 항목별 승인/거부) | High | Pending |
| FR-08 | Diff 적용 (승인 항목만 DB 반영) | High | Pending |
| FR-09 | 전체 동기화 (모든 활성 몰 순차 처리) | Medium | Pending |
| FR-10 | ProductGroup 자동 매핑 (SKU → 바코드 → fallback null) | High | Pending |
| FR-11 | Vendor Upsert (이름 기준, Sync 시 자동 생성) | High | Pending |
| FR-12 | Product View - 리스트/카드 뷰 토글 | Medium | Pending |
| FR-13 | Product View - 필터 (몰, 벤더, 상품 타입, 재고 상태) | Medium | Pending |
| FR-14 | Product View - 검색 (상품명, SKU, 바코드) | Medium | Pending |
| FR-15 | Product View - 정렬 (이름, 가격, 업데이트순, 벤더명) | Low | Pending |
| FR-16 | SyncLog 이력 조회 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Shopify Sync 1000개 상품 5분 이내 | Sync 실행 시간 측정 |
| Performance | Product 목록 API 응답 < 500ms | API 응답 시간 |
| Security | Access Token 암호화 저장 | DB 필드 암호화 확인 |
| Security | Shopify API 호출 Rate Limit 준수 | Shopify API 2/sec |
| UX | Diff Review에서 변경 필드별 이전→새값 명시 | UI 검증 |
| Data Integrity | 동기화 중 실패 시 부분 반영 방지 (트랜잭션) | 에러 시나리오 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Shop 추가 후 첫 동기화로 전체 상품 Import 성공
- [ ] 재동기화 시 Diff Review 정상 표시 + 선택 반영
- [ ] ProductGroup이 SKU 기준으로 크로스 스토어 자동 매핑
- [ ] Product View에서 필터/검색/정렬 정상 동작
- [ ] 4개 몰 각각 동기화 테스트 통과
- [ ] SyncLog에 동기화 이력 정상 기록

### 4.2 Quality Criteria

- [ ] API 에러 핸들링 (Shopify API 실패, Rate Limit, 네트워크 에러)
- [ ] 동기화 중단 시 Shop 상태 FAILED로 정확히 전환
- [ ] Zero lint errors
- [ ] Build succeeds (Next.js production build)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Shopify API Rate Limit 초과 | High | Medium | GraphQL Bulk Operation 사용 또는 throttle 적용 |
| 대량 상품 Sync 시 메모리 문제 | Medium | Medium | Pagination + 스트리밍 처리, 배치 단위 커밋 |
| Diff 생성 시 데이터 불일치 | High | Low | shopifyProductId + shopifyVariantId 유니크 키 기준 비교 |
| Access Token 유출 | High | Low | 환경변수 + DB 암호화 저장, .env 파일 gitignore |
| ProductGroup 잘못된 매핑 | Medium | Medium | Admin UI에서 수동 수정 가능하도록 설계 |
| 동기화 중 사용자 데이터 조작 | Medium | Low | Sync 진행 중 해당 Shop 편집 잠금 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | |
| **Dynamic** | Feature-based modules, services layer | Web apps with backend, SaaS MVPs | **v** |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | **Next.js (App Router)** | Vercel 배포, SSR + API routes 통합 |
| ORM | Prisma / Drizzle / TypeORM | **Prisma** | 타입 안전, 마이그레이션, Schema Reference 이미 Prisma 문법 |
| DB | PostgreSQL / MySQL / SQLite | **PostgreSQL** | FOR UPDATE, Advisory Lock 지원 (Phase 2 필요) |
| API Client | fetch / axios / react-query | **react-query + fetch** | 캐시, 자동 재시도, 상태 관리 |
| Styling | Tailwind / CSS Modules | **Tailwind CSS** | 빠른 개발, shadcn/ui 호환 |
| UI Components | shadcn/ui / MUI / Ant | **shadcn/ui** | Tailwind 기반, 커스텀 자유도 높음 |
| State Management | Context / Zustand / Jotai | **Zustand** | 경량, 보일러플레이트 최소 |
| Form | react-hook-form / formik | **react-hook-form** | 성능, Zod 연동 |
| Validation | Zod / Yup / Joi | **Zod** | TypeScript 친화, Prisma 타입과 연동 |

### 6.3 Folder Structure Preview

```
Selected Level: Dynamic

src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/
│   │   ├── shops/                # Shop 관리 페이지
│   │   │   ├── page.tsx          # Shop List
│   │   │   ├── new/page.tsx      # Shop 추가
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Shop 상세
│   │   │       ├── edit/page.tsx  # Shop 수정
│   │   │       └── sync/page.tsx  # Diff Review
│   │   └── products/             # Product View 페이지
│   │       └── page.tsx          # Product List/Card
│   └── api/
│       ├── shops/                # Shop CRUD + Sync API
│       └── products/             # Product 조회 API
├── components/                   # 공통 UI 컴포넌트
├── features/                     # Feature-based 모듈
│   ├── shops/                    # Shop 관련 로직
│   │   ├── components/           # Shop 전용 컴포넌트
│   │   ├── hooks/                # useShops, useSync 등
│   │   ├── services/             # Shopify API 서비스
│   │   └── types/                # Shop 타입 정의
│   └── products/                 # Product 관련 로직
│       ├── components/
│       ├── hooks/
│       └── types/
├── lib/                          # 유틸리티
│   ├── prisma.ts                 # Prisma client
│   ├── shopify/                  # Shopify GraphQL 클라이언트
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── types/                        # 글로벌 타입
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section
- [ ] ESLint configuration (`.eslintrc.*`)
- [ ] Prettier configuration (`.prettierrc`)
- [x] TypeScript configuration (`tsconfig.json`) — Next.js 기본 제공

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | Missing | PascalCase 컴포넌트, camelCase 함수/변수, UPPER_SNAKE enum | High |
| **Folder structure** | Missing | Dynamic level feature-based 구조 | High |
| **Import order** | Missing | React > Next > 외부 > 내부 > 타입 | Medium |
| **API 패턴** | Missing | App Router route handlers, Zod validation | High |
| **Error handling** | Missing | try-catch + typed errors, toast 알림 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `DATABASE_URL` | PostgreSQL 연결 | Server | Yes |
| `DIRECT_URL` | Prisma direct connection (Vercel) | Server | Yes |
| `NEXT_PUBLIC_APP_URL` | 앱 기본 URL | Client | Yes |

> Shopify Access Token은 Shop별로 DB에 암호화 저장 (환경변수 아님)

---

## 8. Implementation Order

Phase 0-1 구현은 다음 순서로 진행:

> **Prerequisites**: i18n 인프라 (next-intl 설정, common.json 번역)가 먼저 완료되어야 함.
> [i18n.plan.md](./i18n.plan.md) Sprint 0 참고. 모든 UI 텍스트는 번역 키(`t()`) 기반으로 작성.

### Sprint 1: DB & 기본 API (Days 1-2)

1. [ ] Prisma 스키마 작성 (ShopifyStore, Product, ProductGroup, Vendor, SyncLog)
2. [ ] DB 마이그레이션 실행
3. [ ] Shop CRUD API (GET/POST/PUT/DELETE `/api/shops`)
4. [ ] Shop List UI + 추가/수정/삭제 폼

### Sprint 2: Shopify Sync (Days 3-5)

5. [ ] Shopify GraphQL 클라이언트 구현
6. [ ] 첫 동기화 로직 (Fetch → Vendor Upsert → Product 생성 → ProductGroup 매핑)
7. [ ] 재동기화 Diff 생성 로직 (비교 → NEW/MODIFIED/REMOVED 분류)
8. [ ] Diff Review UI (요약 대시보드 + 탭별 상세)
9. [ ] Diff 적용 로직 + SyncLog 기록
10. [ ] 전체 동기화 (순차 처리)

### Sprint 3: Product View (Days 6-7)

11. [ ] GET `/api/products` API (필터, 검색, 정렬, 페이지네이션)
12. [ ] Product List View + Card View + 뷰 토글
13. [ ] 필터 컴포넌트 (동적 옵션)
14. [ ] 검색 컴포넌트
15. [ ] GET `/api/product-groups` API

---

## 9. Next Steps

1. [ ] Write design document (`Phase0-1.design.md`)
2. [ ] Set up Next.js project + Prisma + PostgreSQL
3. [ ] Start Sprint 1 implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-06 | Initial draft from Phase 0-1 spec | BDJ Team |
