# Label Printing Enhancement Planning Document

> **Summary**: 라벨 프린터(Rollo X1040) 연동을 위한 인벤토리 라벨 출력 기능 개선 — 다중 사이즈, 배치 인쇄, 모바일 지원
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-13
> **Status**: Draft
> **Depends On**: inventory-enhancement (completed, 100%), inventory-grouped-view (completed, 97%)

---

## 1. Overview

### 1.1 Purpose

현재 인벤토리의 라벨 출력 기능은 기본적인 `window.print()` 기반으로, 고정 60mm 폭의 단일 아이템 출력만 지원한다. Rollo X1040 Wireless 라벨 프린터 도입에 맞추어, 다양한 라벨 사이즈에 대응하고, 배치 인쇄와 모바일(폰) 출력 워크플로우를 지원하도록 개선한다.

### 1.2 Background

**운영 시나리오:**
1. 폰에서 바코드 스캔(또는 검색) → 인벤토리 등록 (1개 이상)
2. 인벤토리 생성 시 바코드 자동 발급 (BDJ-XXXXXX-NNN)
3. 폰에서 프린트 요청 → Rollo 프린터에서 라벨 출력 (WiFi/AirPrint)
4. 출력된 라벨을 상품에 부착
5. 이후 필요 시 랩탑이나 폰에서 개별 또는 배치 재출력

**타겟 하드웨어: Rollo X1040 Wireless**
- 해상도: 203 x 203 DPI
- 라벨 폭: 1.57" ~ 4.1" (40mm ~ 104mm)
- 연결: WiFi + AirPrint + USB
- 속도: 150 mm/s (초당 1장)
- 지원 OS: iPhone, iPad, Mac, Windows, Android, Chromebook, Linux
- 기본 라벨: 4x6, 2x1, 2" round — 커스텀 사이즈는 Rollo Printer Portal에서 설정 가능

### 1.3 Related Documents

- Inventory Enhancement Plan: [inventory-enhancement.plan.md](inventory-enhancement.plan.md)
- Inventory Grouped View Plan: [inventory-grouped-view.plan.md](inventory-grouped-view.plan.md)

---

## 2. Scope

### 2.1 In Scope

| # | Feature | Priority | Description |
|---|---------|:--------:|-------------|
| 1 | 라벨 사이즈 프리셋 | HIGH | 2"x1", 2.25"x1.25", 4"x6" 등 프리셋 선택 + 커스텀 사이즈 입력 |
| 2 | 사이즈별 바코드 최적화 | HIGH | 선택된 라벨 사이즈에 맞게 바코드 크기, 폰트, 여백 자동 조정 |
| 3 | CSS @page 기반 정밀 출력 | HIGH | `@page { size: Xin Yin; margin: 0; }` 으로 라벨 프린터에 정확한 사이즈 전달 |
| 4 | 단일 인벤토리 아이템 출력 | HIGH | 기존 기능 유지 — 개별 인벤토리에서 프린트 버튼 |
| 5 | 프로덕트 레벨 배치 출력 | HIGH | 프로덕트 그룹에서 프린트 → 해당 프로덕트의 모든 인벤토리 라벨 순차 출력 |
| 6 | 출력 미리보기 개선 | MEDIUM | 실제 라벨 비율로 미리보기 + 항목 수 표시 |
| 7 | 라벨 사이즈 설정 저장 | MEDIUM | 선택한 라벨 사이즈를 localStorage에 저장 (다음 출력 시 유지) |
| 8 | i18n | MEDIUM | 신규 UI 요소 EN/KO 번역 |

### 2.2 Out of Scope

| # | Feature | Reason |
|---|---------|--------|
| 1 | Rollo SDK/API 직접 통신 | 브라우저 기반 인쇄로 충분 — AirPrint/WiFi로 네이티브 지원 |
| 2 | QZ Tray / Raw ESC/POS 명령 | 추가 소프트웨어 설치 필요 — 단순성 유지 |
| 3 | 프린터 상태 모니터링 | OS 레벨에서 처리 |
| 4 | 라벨 디자인 편집기 | 현 단계에서 불필요 |

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-01: 라벨 사이즈 프리셋 시스템

```
사용자가 출력 전 라벨 사이즈를 선택할 수 있어야 한다.
프리셋: 2"x1", 2.25"x1.25", 4"x6"
커스텀: 폭(inch)과 높이(inch) 직접 입력
마지막 선택은 localStorage에 저장하여 다음 출력 시 자동 적용
Rollo X1040 지원 범위: 폭 1.57"~4.1"
```

#### FR-02: 사이즈 적응형 바코드 렌더링

```
선택된 라벨 사이즈에 따라:
- 바코드 width (bar 두께): 라벨 폭에 비례하여 자동 계산
- 바코드 height: 라벨 높이의 40~50%
- 폰트 크기: 라벨 크기에 비례
- 여백(margin/padding): 라벨 크기에 비례
- 상품명: 작은 라벨(2x1)에서는 축약 또는 생략
CODE128 포맷 유지 (현행)
```

#### FR-03: CSS @page 정밀 출력

```
@media print에서:
- @page { size: [width]in [height]in; margin: 0; }
- 각 라벨은 별도 페이지로 (page-break-after: always)
- 라벨 프린터가 정확한 사이즈로 인식하도록 함
- Rollo는 AirPrint 프로토콜을 통해 @page size를 인식
```

#### FR-04: 단일 아이템 출력

```
기존 동작 유지:
- InventoryTable, InventoryGroupedTable, InventoryCard에서 프린트 아이콘 클릭
- LabelPrintView 모달 열림
- 1개 라벨 미리보기 → 인쇄 버튼 → window.print()
```

#### FR-05: 프로덕트 레벨 배치 출력

```
Grouped View (InventoryGroupedTable)에서:
- 프로덕트 그룹 행에 "프린트 전체" 버튼 추가
- 클릭 시 해당 프로덕트의 모든 인벤토리 아이템 라벨을 LabelPrintView에 전달
- 미리보기에서 N개 라벨 모두 표시 (스크롤)
- "인쇄" 클릭 → window.print() → 각 라벨이 별도 페이지로 순차 출력
- 라벨 수 표시: "3개 라벨 출력 예정" 등
```

#### FR-06: 출력 미리보기 개선

```
LabelPrintView 모달:
- 상단에 라벨 사이즈 선택 드롭다운
- 미리보기에서 실제 비율로 표시 (2:1 비율 등)
- 여러 개일 경우 좌우 스크롤 또는 그리드 배치
- "N개 라벨" 카운터 표시
```

### 3.2 Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| 1 | 모바일 반응형 | 폰 화면에서 미리보기 및 인쇄 버튼 사용 가능 |
| 2 | 프린터 호환성 | AirPrint 지원 프린터 전반 (Rollo X1040 최적화) |
| 3 | 성능 | 20개 이하 라벨 배치 인쇄 시 즉각 렌더링 |
| 4 | 오프라인 출력 | 같은 네트워크에서 인터넷 없이도 출력 가능 (AirPrint) |

---

## 4. Technical Approach

### 4.1 출력 방식: `window.print()` + CSS `@page`

Rollo X1040은 AirPrint를 지원하므로, 브라우저의 네이티브 인쇄 기능(`window.print()`)을 그대로 활용한다.

핵심은 **CSS `@page` 규칙**으로 정확한 라벨 사이즈를 프린터에 전달하는 것이다:

```css
@page {
  size: 2in 1in;  /* 라벨 사이즈 동적 설정 */
  margin: 0;
}
```

이 방식의 장점:
- 추가 소프트웨어/드라이버 불필요
- iPhone AirPrint, Mac, Windows 모두 동일하게 동작
- Rollo Printer Portal에서 라벨 사이즈 매칭만 설정하면 됨

### 4.2 바코드 사이즈 계산 전략

라벨 사이즈에 따른 바코드 파라미터 자동 계산:

| Label Size | Barcode Width (bar) | Barcode Height | Font Size | Product Name |
|-----------|:---:|:---:|:---:|:---:|
| 2" x 1" | 1.0 | 30px | 8px | 생략 |
| 2.25" x 1.25" | 1.2 | 40px | 9px | 1줄 축약 |
| 4" x 6" | 2.0 | 80px | 14px | 전체 표시 |

### 4.3 배치 인쇄 구조

```
Product Group (e.g., "Blue Jacket")
├── INV-001 (BDJ-ABC123-001) → Label Page 1
├── INV-002 (BDJ-ABC123-002) → Label Page 2
└── INV-003 (BDJ-ABC123-003) → Label Page 3

window.print() → 3 pages, each 2"x1" → Rollo prints 3 labels sequentially
```

### 4.4 수정 대상 파일

| # | File | Action | Description |
|---|------|:------:|-------------|
| 1 | `src/features/inventory/types/index.ts` | MODIFY | LabelSize 타입, 프리셋 상수 추가 |
| 2 | `src/features/inventory/components/LabelPrintView.tsx` | REWRITE | 사이즈 선택, 배치 미리보기, @page CSS |
| 3 | `src/components/Barcode.tsx` | MODIFY | 사이즈 적응형 파라미터 지원 |
| 4 | `src/features/inventory/components/InventoryGroupedTable.tsx` | MODIFY | 프로덕트 레벨 프린트 버튼 추가 |
| 5 | `src/app/(dashboard)/inventory/page.tsx` | MODIFY | 배치 프린트 핸들러, printData 확장 |
| 6 | `src/features/inventory/hooks/useGroupedInventory.ts` | MODIFY | 프로덕트별 전체 아이템 fetch 지원 |
| 7 | `src/messages/en/inventory.json` | MODIFY | 라벨 프린트 관련 번역 키 추가 |
| 8 | `src/messages/ko/inventory.json` | MODIFY | 동일 |

### 4.5 라벨 사이즈 설정 저장

```typescript
// localStorage key: 'bdj-label-size'
interface LabelSizePreset {
  name: string;       // "2x1", "2.25x1.25", "4x6", "custom"
  width: number;      // inches
  height: number;     // inches
}

const LABEL_PRESETS: LabelSizePreset[] = [
  { name: '2x1', width: 2, height: 1 },
  { name: '2.25x1.25', width: 2.25, height: 1.25 },
  { name: '4x6', width: 4, height: 6 },
];
```

---

## 5. Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|------|:------:|------------|
| 1 | 브라우저마다 `@page size` 지원 차이 | HIGH | Chrome/Safari 최신 버전 기준. 미지원 브라우저는 수동 용지 사이즈 설정 안내 |
| 2 | AirPrint에서 커스텀 사이즈 미인식 | MEDIUM | Rollo Printer Portal에서 라벨 사이즈 프리셋 사전 설정 필요 — 문서화 |
| 3 | 배치 인쇄 시 라벨 순서 보장 | LOW | CSS `page-break-after: always`로 각 라벨 별도 페이지 처리 |
| 4 | 바코드가 작은 라벨에서 스캔 불가 | MEDIUM | 2x1 사이즈에서 스캐너 테스트 후 최소 bar width 결정 |

---

## 6. Success Criteria

| # | Criteria | Measurement |
|---|---------|-------------|
| 1 | 라벨 프리셋 3종 선택 가능 | UI에서 선택 후 미리보기 변경 확인 |
| 2 | 2x1 라벨이 Rollo에서 정확한 사이즈로 출력 | 실물 측정 오차 ±1mm |
| 3 | 프로덕트 배치 인쇄 시 모든 아이템 순차 출력 | 5개 아이템 테스트 |
| 4 | iPhone에서 AirPrint로 Rollo에 출력 | Safari → print → Rollo 선택 → 출력 |
| 5 | 라벨 사이즈 설정 유지 | 브라우저 새로고침 후에도 이전 선택 유지 |

---

## 7. Timeline

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Design | 상세 설계 문서 작성 | - |
| Do - Step 1 | 타입 정의 + 라벨 프리셋 상수 | - |
| Do - Step 2 | Barcode 컴포넌트 사이즈 적응 | - |
| Do - Step 3 | LabelPrintView 리라이트 (사이즈 선택 + @page CSS) | - |
| Do - Step 4 | 배치 인쇄 (GroupedTable + Page 핸들러) | - |
| Do - Step 5 | i18n | - |
| Check | Gap Analysis | - |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial plan | BDJ Team |
