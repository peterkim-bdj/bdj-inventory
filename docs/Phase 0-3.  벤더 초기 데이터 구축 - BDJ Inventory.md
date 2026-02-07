---
created: 2026-02-05
tags:
  - BDJ-Inventory
  - Phase0
  - Vendor
  - Data-Management
source_url: 
source_type: Other
channel: "[[BDJ Inventory]]"
status: Summarized
---

# Phase 0-3: 벤더 초기 데이터 구축 - BDJ Inventory

> [!tldr] 💡 핵심 한 줄
> Phase 0에서 이름만 생성된 Vendor에 연락처를 채우고, 직접 입력·시트 Import·View UI로 벤더를 관리하여 향후 발주 자동화 기반을 구축한다.
> 
> Fill in contact details for name-only Vendors from Phase 0, manage vendors via direct input, sheet import, and View UI to build the foundation for future purchase order automation.

## 핵심 요약

Phase 0 Import 스크립트에서 이름만 생성된 Vendor 레코드에 **연락처, 메모, 발주 설정** 등 상세 정보를 채운다. 직접 입력(1~2건)과 시트 Import(대량)를 지원하며, Vendor View UI로 전체 벤더를 리스트/카드 뷰로 확인하고 연락처 미입력 벤더를 우선 표시한다.

## 주요 내용

### 데이터 입력 방식

| 방식 | 용도 | 시점 |
|------|------|------|
| 직접 입력 | 1~2개 신규 벤더 추가 | 상시 |
| 시트 Import | 기존 벤더 목록 대량 등록/업데이트 | 초기 1회 |
| Phase 0 벤더 편집 | 이름만 있는 레코드에 연락처 추가 | 초기 |

### 1. 직접 입력 (Create/Edit)

**입력 폼 필드:**

| 필드 | 필수 | 설명 |
|------|------|------|
| 벤더명 | * | 고유 이름 |
| 내부 코드 | | 예: NK-KR |
| 담당자명 | | 연락 담당자 |
| 전화번호 | | 발주 시 사용 |
| 이메일 | | 발주 시 사용 |
| 웹사이트 | | |
| 주소 | | |
| 메모 | | "월요일 오전 연락 선호" 등 |
| 자동 알림 | | ON/OFF (default OFF) |
| 리드타임 | | 발주~입고 일수 (default 3) |

### 2. 시트 Import

#### 지원 형식

| 형식 | 방법 |
|------|------|
| Google Sheets | URL 붙여넣기 → API로 읽기 |
| Excel (.xlsx) | 파일 업로드 → 파싱 |
| CSV (.csv) | 파일 업로드 → 파싱 |

#### 시트 템플릿

| name* | code | contactName | phone | email | website | address | notes | minLeadDays |
|-------|------|-------------|-------|-------|---------|---------|-------|-------------|
| Nike Korea | NK-KR | 김철수 | 02-1234-5678 | kim@nike.co.kr | | 서울시 강남구 | 월요일 오전 | 3 |
| Adidas KR | AD-KR | 박영희 | 02-9876-5432 | park@adidas.kr | | 서울시 용산구 | | 5 |

#### Import 플로우
```
[1. 파일 업로드 / URL 입력]
        │
        ▼
[2. 미리보기 (Preview)]
   - 파싱된 데이터 테이블 표시
   - 컬럼 매핑 확인 (자동 감지 + 수동 조정)
   - 유효성 검사:
     ✅ 정상
     ⚠️ 중복 (이미 DB에 있는 name)
     ❌ 오류 (필수값 누락)
        │
        ▼
[3. Import 옵션]
   - 중복 처리: 건너뛰기 / 업데이트 / 오류
   - 빈 값: 무시 / 기존 값 덮어쓰기
        │
        ▼
[4. 실행]
   - Upsert (name 기준)
   - 결과: 생성 N, 업데이트 N, 스킵 N, 오류 N
```

### 3. 벤더 View

#### 뷰 모드

| 모드 | 용도 | 표시 정보 |
|------|------|----------|
| **리스트** | 전체 목록, 빠른 확인 | 이름, 담당자, 전화, 이메일, 상품 수, 리드타임 |
| **카드** | 시각적 확인, 연락 액션 | 이름, 연락처 전체, 메모, 원클릭 전화/이메일 |

#### 필터

| 필터 | 타입 | 옵션 |
|------|------|------|
| 연락처 상태 | Single-select | 전체, 연락처 있음, **연락처 미입력** |
| 활성 상태 | Single-select | 전체, 활성, 비활성 |
| 자동 알림 | Single-select | 전체, ON, OFF |

#### 검색

| 검색 대상 | 매칭 방식 |
|----------|----------|
| 벤더명 | 부분 매칭 |
| 담당자명 | 부분 매칭 |
| 코드 | 정확/부분 매칭 |

#### 정렬

이름 (A-Z), 상품 수 (많은순), 리드타임 (짧은순), **연락처 미입력 우선 (기본)**

> [!tip] 기본 정렬: 연락처 미입력 우선
> Phase 0에서 이름만 들어간 벤더가 상단에 표시되어, 뭘 채워야 하는지 바로 파악 가능.

### 4. 벤더 상세 페이지

- 기본 정보 + 연락처 + 메모 + 발주 설정
- **이 벤더의 상품 목록** (Product 테이블과 연결)
- **원클릭 액션**: 📞 전화걸기, 📧 이메일
- **발주 이력** (Phase 3에서 구현)

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/vendors | 필터, 검색, 정렬, 페이지네이션 |
| GET | /api/vendors/:id | 상세 (상품 목록 포함) |
| POST | /api/vendors | 직접 생성 |
| PUT | /api/vendors/:id | 수정 |
| DELETE | /api/vendors/:id | 비활성화 (soft delete) |
| POST | /api/vendors/import | 시트 Import |
| GET | /api/vendors/import/template | 템플릿 다운로드 (xlsx) |

#### GET /api/vendors 파라미터
```typescript
{
  search?: string,
  hasContact?: boolean,     // 연락처 유무
  isActive?: boolean,
  autoNotify?: boolean,
  sortBy?: 'name' | 'productCount' | 'minLeadDays' | 'contactStatus',
  sortOrder?: 'asc' | 'desc',
  page?: number,
  limit?: number,
}
```

#### POST /api/vendors/import Response
```typescript
{
  summary: {
    total: 15,
    created: 12,
    updated: 1,
    skipped: 1,
    errors: 1,
  },
  errors: [
    { row: 5, field: 'name', message: '필수 값 누락' }
  ]
}
```

### 스키마 (변경 없음)

> [!note] 스키마 최종 기준: [[Schema Reference - BDJ Inventory]]

> [!info] 스키마 변경 없음
> Vendor 스키마는 [[BDJ Phase0-1 Initial Data Setup]]에서 이미 정의 완료. Phase 0-3에서는 추가 변경 없이 기존 스키마를 활용한다.
```prisma
model Vendor {
  id            String    @id @default(cuid())
  name          String    @unique
  code          String?   @unique
  contactName   String?
  phone         String?
  email         String?
  website       String?
  address       String?
  notes         String?
  autoNotify    Boolean   @default(false)
  minLeadDays   Int       @default(3)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  products      Product[]
}
```

## 핵심 인사이트

- **연락처 미입력 우선 정렬**: Phase 0에서 이름만 생성된 벤더를 빠르게 찾아 연락처를 채울 수 있음
- **시트 Import의 Upsert**: name 기준으로 중복 체크하여 기존 벤더는 업데이트, 신규는 생성 → 반복 실행 안전
- **벤더 상세 → 상품 목록 연결**: 벤더 페이지에서 해당 벤더의 모든 상품을 바로 확인 가능
- **원클릭 전화/이메일**: 재고 부족 시 벤더 연락 프로세스를 최소화하는 UI 설계
- **Google Sheets 지원**: URL만 붙여넣으면 팀원이 공유 시트에서 벤더 정보 관리 가능

## 체크리스트

- [ ] Vendor CRUD API
- [ ] 시트 Import API (xlsx, csv, Google Sheets)
- [ ] Import 미리보기 (파싱 + 유효성 검사)
- [ ] Import 템플릿 다운로드
- [ ] Vendor List View
- [ ] Vendor Card View
- [ ] Vendor 상세 페이지 (상품 목록 포함)
- [ ] Vendor 생성/수정 폼
- [ ] 필터 (연락처 상태, 활성, 알림)
- [ ] 검색 (이름, 담당자, 코드)
- [ ] 뷰 토글 (리스트/카드)
- [ ] 연락처 미입력 강조 표시

## 관련 노트

- [[BDJ Phase0-1 Initial Data Setup]]
- [[BDJ Phase0-2 Inventory Registration]]
- [[BDJ Inventory - Phase 1 Development Strategy]]
- [[Google Sheets API]]

---

## 🌐 English Summary

**Phase 0-3: Vendor Initial Data Setup** fills in contact details for Vendors created with names only during Phase 0 import. Supports direct input (single vendor create/edit), sheet import (bulk upload via Excel, CSV, or Google Sheets URL with preview, validation, and upsert by name), and a Vendor View UI with list/card modes, filters (contact status, active, auto-notify), and search (name, contact person, code). Default sort is "missing contact first" so incomplete vendors surface immediately. The vendor detail page shows all associated products and provides one-click call/email actions. No schema changes needed — uses the Vendor model defined in Phase 0-1.