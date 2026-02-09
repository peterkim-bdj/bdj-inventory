# Smart Search Planning Document

> **Summary**: Products/Inventory 검색 입력에 카메라 스캔 기능 추가 (바코드 스캔 + OCR 텍스트 인식)
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-08
> **Status**: Draft
> **Depends On**: inventory-enhancement (completed, 100% match)

---

## 1. Overview

### 1.1 Purpose

현재 Products/Inventory 페이지의 검색은 텍스트 입력만 지원한다. 실무에서는 폰으로 상품 바코드를 스캔하거나, 바코드가 없는 경우 SKU 라벨/상품명을 카메라로 촬영하여 검색하고 싶은 니즈가 있다.

검색 입력 앞에 스캔 아이콘을 추가하여, 클릭 시 카메라 모달이 열리고:
1. **바코드 스캔** → 즉시 검색어로 입력
2. **OCR 텍스트 인식** → 카메라로 SKU/상품명을 촬영하여 텍스트로 변환 후 검색

### 1.2 Background

- `html5-qrcode` 라이브러리는 이미 프로젝트에 설치됨 (인벤토리 등록 페이지 BarcodeScanner에서 사용)
- 바코드 스캔 기술은 검증 완료 (16개 포맷 지원, iPhone에서 동작 확인)
- OCR은 신규 기능 — 기술 타진 필요

### 1.3 Related Documents

- inventory-enhancement: 검색/필터 기능 (완료)
- Phase0-2: BarcodeScanner 컴포넌트 (html5-qrcode 기반)

---

## 2. OCR 기술 조사 결과

### 2.1 Tesseract.js (권장)

| 항목 | 내용 |
|------|------|
| 라이브러리 | [tesseract.js](https://github.com/naptha/tesseract.js) v5 |
| 동작 방식 | WebAssembly 기반, 브라우저에서 완전 로컬 실행 |
| 지원 언어 | 100+ (영어/한국어 포함) |
| 패키지 크기 | v5에서 54% 감소 (영어 기준) |
| 비용 | 무료 (오픈소스) |
| 네트워크 | 불필요 (오프라인 가능, 언어 데이터 초회 다운로드만 필요) |

**정확도 평가**:

| 시나리오 | 예상 정확도 | 비고 |
|----------|:-----------:|------|
| 깨끗한 인쇄 SKU 라벨 (고대비, 흰배경) | 90-95% | 최적 조건 |
| 일반 상품 라벨 (보통 조건) | 80-90% | 전처리 필요 |
| 손글씨/복잡한 레이아웃 | 50-70% | 권장하지 않음 |
| 작은 글씨/저조도 | 60-80% | 화이트리스트 설정 시 개선 |

**정확도 개선 방법**:
- `tessedit_char_whitelist`: 인식 문자 범위 제한 (예: SKU는 영숫자+하이픈만)
- `psm` (Page Segmentation Mode): 단일 라인/단어 모드 설정
- 이미지 전처리: 그레이스케일, 대비 향상, 노이즈 제거
- 크롭 가이드: 사용자에게 인식 영역 안내

### 2.2 Google Cloud Vision (대안)

| 항목 | 내용 |
|------|------|
| 정확도 | 95-99% |
| 비용 | 1,000건/월 무료, 이후 $1.50/1,000건 |
| 네트워크 | 필요 (API 호출) |
| 설정 | API 키, 서버사이드 프록시 필요 |

**결론**: Phase 1에서는 Tesseract.js로 시작 (무료, 오프라인, 설정 간편). SKU 라벨 같은 깨끗한 인쇄 텍스트에는 충분한 정확도. 향후 정확도가 부족하면 Cloud Vision으로 전환 가능.

### 2.3 기술 결정

| 기능 | 기술 | 이유 |
|------|------|------|
| 바코드 스캔 | html5-qrcode (기존) | 이미 검증됨, 16포맷 |
| OCR 텍스트 인식 | tesseract.js v5 | 무료, 로컬, SKU에 충분한 정확도 |
| 카메라 접근 | getUserMedia (HTTPS) | 기존 패턴 |

---

## 3. Scope

### 3.1 In Scope

- [x] FR-01: 공통 SmartSearchInput 컴포넌트 (검색 + 스캔 아이콘)
- [x] FR-02: 스캔 아이콘 클릭 → 카메라 모달 (바코드/OCR 탭)
- [x] FR-03: 바코드 탭 — html5-qrcode로 스캔, 결과를 검색어에 자동 입력
- [x] FR-04: OCR 탭 — 카메라 촬영 → Tesseract.js로 텍스트 인식 → 검색어에 자동 입력
- [x] FR-05: OCR 결과 확인 UI (인식된 텍스트 표시, 사용자가 수정/확인 가능)
- [x] FR-06: Products 검색에 SmartSearchInput 적용
- [x] FR-07: Inventory 검색에 SmartSearchInput 적용
- [x] FR-08: i18n 키 추가 (en/ko)
- [x] FR-09: HTTPS 필수 안내 (HTTP 환경에서 카메라 불가 시 안내 메시지)

### 3.2 Out of Scope

- Cloud Vision API 연동 (향후)
- 연속 스캔 모드 (한 번에 여러 개 스캔)
- 바코드 자동 포커스/줌 기능
- OCR 언어 선택 UI (기본 영어, 필요 시 확장)

---

## 4. Requirements

### 4.1 Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|:--------:|-------|
| FR-01 | SmartSearchInput: 검색 입력 + 왼쪽 스캔 아이콘 | High | 기존 ProductSearch/InventorySearch 대체 |
| FR-02 | 카메라 모달: 바코드/OCR 탭 전환 | High | 모달 오버레이, 바코드 기본 탭 |
| FR-03 | 바코드 스캔: html5-qrcode 사용, 스캔 성공 시 자동 검색 | High | BarcodeScanner 패턴 재사용 |
| FR-04 | OCR 인식: 캡처 버튼 → 이미지 촬영 → Tesseract.js 처리 | High | 처리 중 로딩 표시 |
| FR-05 | OCR 결과 확인: 인식 텍스트 표시, 수정 가능, 확인 버튼 | Medium | 자동 입력이 아닌 확인 후 적용 |
| FR-06 | Products 페이지 적용 | High | ProductSearch → SmartSearchInput |
| FR-07 | Inventory 페이지 적용 | High | InventorySearch → SmartSearchInput |
| FR-08 | i18n (en/ko) | High | 스캔/OCR 관련 키 |
| FR-09 | HTTPS 안내 | Medium | 카메라 접근 실패 시 메시지 |

### 4.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | OCR 처리 시간 < 3초 (일반 텍스트) |
| UX | 바코드 스캔 결과는 즉시 적용, OCR은 확인 후 적용 |
| 접근성 | 카메라 없는 환경에서도 기존 텍스트 입력 유지 |
| 호환성 | iOS Safari, Chrome 모바일, 데스크톱 Chrome |

---

## 5. Technical Approach

### 5.1 컴포넌트 구조

```
src/components/
  └── SmartSearchInput.tsx        (NEW — 공통 검색 + 스캔)

src/components/scan/
  ├── ScanModal.tsx               (NEW — 바코드/OCR 탭 모달)
  ├── BarcodeScanTab.tsx          (NEW — html5-qrcode 기반 바코드 탭)
  └── OcrScanTab.tsx              (NEW — Tesseract.js 기반 OCR 탭)
```

### 5.2 동작 흐름

```
[검색 입력] ──── [스캔 아이콘 클릭] ──── [ScanModal 열림]
                                            │
                                    ┌───────┼───────┐
                                    │               │
                              [바코드 탭]      [OCR 탭]
                                    │               │
                              html5-qrcode    카메라 촬영
                                    │               │
                              스캔 성공        Tesseract.js
                                    │               │
                              즉시 검색어      결과 확인 UI
                                 입력              │
                                    │          확인 클릭
                                    │               │
                                    └───────┬───────┘
                                            │
                                    [검색어에 반영]
                                    [모달 닫힘]
```

### 5.3 OCR 설정

```typescript
// Tesseract.js 설정
const worker = await createWorker('eng'); // 영어 기본
await worker.setParameters({
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_ .',
  tessedit_pageseg_mode: '7', // 단일 라인 모드
});
```

### 5.4 기존 컴포넌트 영향

| Component | 변경 |
|-----------|------|
| `ProductSearch.tsx` | SmartSearchInput으로 대체 (삭제 or 래퍼) |
| `InventorySearch.tsx` | SmartSearchInput으로 대체 (삭제 or 래퍼) |
| `products/page.tsx` | import 변경만 |
| `inventory/page.tsx` | import 변경만 |
| `BarcodeScanner.tsx` | 변경 없음 (등록 페이지 전용, 별도 유지) |

---

## 6. Sprint Plan

### Sprint 1: SmartSearchInput + 바코드 스캔 탭

| # | Task | Files |
|---|------|-------|
| 1 | SmartSearchInput 컴포넌트 (검색 + 스캔 아이콘 + 디바운스) | `src/components/SmartSearchInput.tsx` |
| 2 | ScanModal (탭 UI + 오버레이) | `src/components/scan/ScanModal.tsx` |
| 3 | BarcodeScanTab (html5-qrcode 기반) | `src/components/scan/BarcodeScanTab.tsx` |
| 4 | Products 페이지에 SmartSearchInput 적용 | `products/page.tsx` |
| 5 | Inventory 페이지에 SmartSearchInput 적용 | `inventory/page.tsx` |
| 6 | i18n 키 추가 (common namespace) | `messages/en/common.json`, `messages/ko/common.json` |

### Sprint 2: OCR 탭 + 결과 확인 UI

| # | Task | Files |
|---|------|-------|
| 1 | tesseract.js 설치 + OcrScanTab 구현 | `src/components/scan/OcrScanTab.tsx` |
| 2 | OCR 결과 확인 UI (텍스트 표시 + 수정 + 확인) | OcrScanTab 내부 |
| 3 | ScanModal에 OCR 탭 연결 | `ScanModal.tsx` |
| 4 | 정확도 테스트 (SKU 라벨, 상품명 등) | 수동 테스트 |

---

## 7. File Change Summary

| Type | Count | Files |
|------|:-----:|-------|
| NEW | 4 | SmartSearchInput, ScanModal, BarcodeScanTab, OcrScanTab |
| MODIFY | 4 | products/page.tsx, inventory/page.tsx, common.json (en/ko) |
| DELETE | 0 | (기존 ProductSearch/InventorySearch는 유지, import만 변경) |
| **Total** | **8** | |

---

## 8. Success Criteria

- [ ] 검색 입력에 스캔 아이콘 표시
- [ ] 아이콘 클릭 → 카메라 모달 열림 (바코드/OCR 탭)
- [ ] 바코드 스캔 → 검색어 자동 입력 + 검색 실행
- [ ] OCR 촬영 → 텍스트 인식 → 확인 후 검색어 입력
- [ ] Products/Inventory 양쪽에서 동일하게 동작
- [ ] HTTPS 환경에서 모바일 카메라 동작
- [ ] `npm run build` 성공
- [ ] i18n en/ko 완전 커버

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OCR 정확도 부족 (복잡한 라벨) | Medium | 화이트리스트 + PSM 설정, 결과 확인 UI로 사용자 수정 가능 |
| Tesseract.js 초기 로딩 시간 (언어 데이터) | Low | 스캔 모달 열 때 lazy load, 로딩 인디케이터 |
| HTTP 환경에서 카메라 불가 | Low | 기존 텍스트 입력 유지, HTTPS 안내 메시지 |
| 모바일 브라우저 호환성 | Low | html5-qrcode 이미 검증됨, Tesseract.js는 WebAssembly 기반 |
| 번들 사이즈 증가 | Low | tesseract.js는 dynamic import로 필요할 때만 로드 |

---

## 10. References

- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js) — Pure JS OCR, 100+ languages
- [Tesseract OCR in 2026](https://www.koncile.ai/en/ressources/is-tesseract-still-the-best-open-source-ocr) — Still strong for clean printed text
- [OCR Accuracy Comparison](https://sparkco.ai/blog/comparing-ocr-apis-abbyy-tesseract-google-azure) — Tesseract vs Cloud APIs
- [Barcode + OCR Combo](https://javascriptkicks.com/stories/271111/how-to-build-a-javascript-barcode-scanner-with-tesseract-js-ocr) — JS implementation guide
- [html5-qrcode npm](https://www.npmjs.com/package/html5-qrcode) — Already used in project

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-08 | Initial plan with OCR feasibility study | BDJ Team |
