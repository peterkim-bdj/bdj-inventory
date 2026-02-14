# Scan SKU Detection Planning Document

> **Summary**: 인벤토리 등록 시 카메라 스캔으로 바코드 또는 SKU 텍스트를 자동 감지하여 제품 검색
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-14
> **Status**: Draft
> **Depends On**: smart-search (completed, 99% match)

---

## 1. Overview

### 1.1 Problem

인벤토리 등록 페이지(`/inventory/register`)에서:
- 바코드가 있는 상품: 카메라 스캔 가능 (기존 BarcodeScanner 동작)
- **바코드가 없는 상품이 많음**: SKU 번호나 이름을 수동 입력해야 함 → 휴먼 에러 발생

### 1.2 Solution

카메라 스캔 시 **바코드 OR 텍스트(SKU) 동시 감지**:
1. 바코드 인식 성공 → 기존 플로우 (즉시 제품 검색)
2. 바코드 인식 실패 + 텍스트 감지 → SKU 패턴 자동 추출 → 제품 검색
3. 사용자가 OCR 결과를 확인/수정 후 검색 실행

### 1.3 Background (기존 구현)

| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| `BarcodeScanner` | 등록 페이지 전용 | 바코드만 스캔 (OCR 없음) |
| `ScanModal` | SmartSearchInput (목록 페이지) | 바코드 + OCR 탭 전환 |
| `OcrScanTab` | ScanModal 내부 | Tesseract.js v5 OCR (범용 텍스트) |
| `BarcodeScanTab` | ScanModal 내부 | html5-qrcode 바코드 |
| `/api/inventory/scan` | API | barcode → SKU → name 순서 검색 |

**핵심 발견**: OCR(Tesseract.js)은 이미 구현되어 있지만 **등록 페이지에서는 사용 불가**. 또한 OCR이 범용 텍스트를 캡처할 뿐, **SKU 패턴 자동 감지/필터링 없음**.

---

## 2. Technical Feasibility

### 2.1 OCR로 SKU 감지 가능 여부: **가능**

- Tesseract.js v5는 이미 프로젝트에 설치/동작 중
- `OcrScanTab`에서 `tessedit_char_whitelist`로 영숫자만 인식하도록 설정됨
- SKU는 대체로 `영문+숫자+하이픈` 조합이므로 OCR 인식률이 높음

### 2.2 SKU 패턴 자동 추출 전략

OCR로 인식된 텍스트에서 SKU 후보를 추출하는 방법:

```
// SKU 패턴 예시 (Shopify 기반 일반적 형태)
SKU-001, BDJ-2024-001, SOCK-BLK-M, 12345-AB
```

**접근법: Regex 기반 후보 추출 + DB 매칭**
1. OCR 결과 텍스트에서 SKU 후보 패턴 추출 (영숫자+하이픈 조합, 3자 이상)
2. 추출된 후보들을 DB의 실제 SKU와 매칭
3. 매칭된 결과가 있으면 자동 선택, 없으면 전체 텍스트로 검색

```typescript
// SKU 후보 추출 regex
const SKU_PATTERN = /[A-Za-z0-9][-A-Za-z0-9]{2,}/g;

function extractSkuCandidates(text: string): string[] {
  const matches = text.match(SKU_PATTERN) || [];
  // 길이 3~30, 순수 숫자만은 제외 (바코드와 구분)
  return matches.filter(m => m.length >= 3 && m.length <= 30 && !/^\d+$/.test(m));
}
```

### 2.3 Hybrid Scan 모드 (바코드 + OCR 동시)

**옵션 A: 순차적** (권장)
1. 먼저 바코드 스캔 시도 (자동, 실시간)
2. 바코드 인식 안 되면 OCR 버튼 노출
3. OCR로 텍스트 캡처 → SKU 추출 → 검색

**옵션 B: 동시 실행** (복잡)
1. 카메라 프레임을 바코드+OCR 동시 분석
2. 리소스 사용량 높고, 충돌 가능성

→ **옵션 A 채택**: 현재 UX 패턴 유지, OCR은 보조 수단

---

## 3. Implementation Approach

### 3.1 핵심 변경 사항

1. **등록 페이지 BarcodeScanner에 OCR 탭 추가**
   - 기존 `BarcodeScanner` 컴포넌트에 "텍스트 스캔" 버튼 추가
   - 또는 `ScanModal`의 바코드/OCR 탭 패턴을 등록 페이지에 재활용

2. **SKU 자동 감지 로직 (새로운 유틸)**
   - OCR 결과에서 SKU 후보 패턴 추출
   - API 호출로 DB 매칭 확인
   - 매칭 결과 UI에 표시

3. **Scan API 확장**
   - 현재: 단일 `barcode` 파라미터로 검색
   - 확장: 여러 SKU 후보를 한 번에 검색 (batch match)

### 3.2 UX Flow

```
[등록 페이지]
  ├── 텍스트 입력 (기존)
  ├── 카메라 스캔 (기존 바코드)
  │   └── 바코드 인식 → 제품 검색
  └── 텍스트 스캔 (NEW)
      ├── 카메라 캡처
      ├── Tesseract OCR 실행
      ├── SKU 후보 자동 추출 + 하이라이트
      ├── 사용자 확인/수정
      └── 선택한 SKU로 제품 검색
```

### 3.3 파일 구조

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/lib/sku-detector.ts` | New | SKU 패턴 추출 유틸 |
| `src/features/inventory/components/BarcodeScanner.tsx` | Modify | OCR 모드 추가 |
| `src/app/api/inventory/scan/route.ts` | Modify | multi-candidate 검색 지원 |
| `src/features/inventory/types/index.ts` | Modify | 스캔 결과 타입 확장 |
| `src/messages/en/inventory.json` | Modify | i18n 키 추가 |
| `src/messages/ko/inventory.json` | Modify | i18n 키 추가 |

### 3.4 Dependencies

- `tesseract.js` v5 - 이미 설치됨, 추가 설치 불필요
- `html5-qrcode` - 이미 설치됨

---

## 4. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| OCR 인식률이 낮은 환경 (저조도) | 사용자가 수동 입력해야 함 | 기존 텍스트 입력 유지, OCR은 보조 수단 |
| SKU 패턴이 다양해서 regex 미스매치 | 일부 SKU 놓칠 수 있음 | OCR 결과 전체를 수정 가능하게 유지 |
| 모바일 카메라 성능 차이 | 저사양 기기에서 느림 | Tesseract 동적 import 유지, 로딩 표시 |
| 번들 사이즈 | 이미 Tesseract.js 포함됨 | 동적 import로 코드 스플릿 유지 |

---

## 5. Success Criteria

- [ ] 등록 페이지에서 바코드 스캔 + 텍스트 스캔 모두 가능
- [ ] OCR 결과에서 SKU 후보 자동 추출 및 하이라이트
- [ ] 추출된 SKU로 DB 검색 → 매칭 제품 표시
- [ ] 매칭 안 되면 전체 텍스트로 검색 fallback
- [ ] 기존 바코드 스캔 플로우 변경 없음
- [ ] i18n 지원 (EN/KO)

---

## 6. Estimated Scope

- 신규 파일: 1개 (`sku-detector.ts`)
- 수정 파일: 5개
- 복잡도: Medium (기존 OCR 인프라 재활용)
