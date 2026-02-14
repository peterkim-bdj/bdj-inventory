# Scan SKU Detection Design Document

> **Summary**: 인벤토리 등록 시 카메라로 바코드 또는 SKU 텍스트를 자동 감지하여 제품 검색
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-14
> **Status**: Draft
> **Plan Doc**: [scan-sku-detect.plan.md](../../01-plan/features/scan-sku-detect.plan.md)

---

## 1. Architecture Overview

### 1.1 Component Hierarchy

```
BarcodeScanner (등록 페이지 전용, 기존)
  ├── 텍스트 입력 + Enter (기존 유지)
  ├── 바코드 카메라 모드 (기존 유지)
  └── OCR 텍스트 스캔 모드 (NEW)
        ├── 카메라 프리뷰
        ├── 캡처 버튼
        ├── Tesseract.js OCR 실행
        ├── SKU 후보 추출 (sku-detector.ts)
        └── 후보 선택/수정 → onScan() 콜백
```

### 1.2 File Map

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `src/lib/sku-detector.ts` | NEW | SKU 패턴 추출 유틸 (regex + 필터) |
| 2 | `src/features/inventory/components/BarcodeScanner.tsx` | MODIFY | 3-모드 전환: 입력/바코드/OCR |
| 3 | `src/app/api/inventory/scan/route.ts` | MODIFY | `candidates` 파라미터 추가 (batch SKU match) |
| 4 | `src/features/inventory/types/index.ts` | MODIFY | scanQuerySchema 확장 |
| 5 | `src/features/inventory/hooks/useScanProduct.ts` | MODIFY | candidates 파라미터 지원 |
| 6 | `src/messages/en/inventory.json` | MODIFY | i18n 키 추가 |
| 7 | `src/messages/ko/inventory.json` | MODIFY | i18n 키 추가 |

**Total**: 1 NEW + 6 MODIFY = 7 files

### 1.3 Dependencies

| Package | Version | Status | Usage |
|---------|---------|--------|-------|
| `tesseract.js` | v5 | Installed | OCR text recognition |
| `html5-qrcode` | existing | Installed | Barcode scanning |

추가 설치 없음.

---

## 2. Detailed File Specifications

### 2.1 `src/lib/sku-detector.ts` (NEW)

SKU 후보 패턴을 OCR 텍스트에서 추출하는 순수 유틸 함수.

```typescript
/**
 * SKU 패턴 regex:
 * - 영문자 포함 필수 (순수 숫자 = 바코드일 가능성, 제외)
 * - 영숫자 + 하이픈/언더스코어 조합
 * - 길이 3~30자
 */
const SKU_PATTERN = /(?=[A-Za-z0-9-_]*[A-Za-z])[A-Za-z0-9][-_A-Za-z0-9]{2,29}/g;

export function extractSkuCandidates(text: string): string[] {
  const matches = text.match(SKU_PATTERN) || [];
  // 중복 제거, 대문자 정규화
  const unique = [...new Set(matches.map(m => m.toUpperCase()))];
  // 일반 영단어 필터 (the, and, for 등 제외)
  const COMMON_WORDS = new Set(['THE', 'AND', 'FOR', 'NOT', 'ARE', 'BUT', 'WAS', 'ALL', 'CAN', 'HAD', 'HER', 'ONE', 'OUR', 'OUT', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'MAY', 'SAY', 'SHE', 'TWO', 'HOW', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'TOO', 'USE']);
  return unique.filter(m => !COMMON_WORDS.has(m));
}

/**
 * OCR 텍스트에서 가장 유력한 SKU를 반환
 * (DB 매칭 전 pre-filter 용)
 */
export function getBestSkuCandidate(text: string): string | null {
  const candidates = extractSkuCandidates(text);
  // 하이픈/언더스코어 포함 = 더 SKU답다 → 우선순위 높임
  const sorted = candidates.sort((a, b) => {
    const aHas = /[-_]/.test(a) ? 1 : 0;
    const bHas = /[-_]/.test(b) ? 1 : 0;
    return bHas - aHas || a.length - b.length;
  });
  return sorted[0] ?? null;
}
```

**테스트 케이스**:
- `"SKU-001 Wool Socks"` → `["SKU-001"]`
- `"BDJ-2024-001 Black M"` → `["BDJ-2024-001"]`
- `"12345678"` (순수 숫자) → `[]` (바코드로 분류, 제외)
- `"SOCK-BLK-M Size Medium"` → `["SOCK-BLK-M"]`

### 2.2 `src/features/inventory/components/BarcodeScanner.tsx` (MODIFY)

#### 변경 개요

기존 2-모드(텍스트 입력 / 바코드 카메라)에 **OCR 모드** 추가 → 3-모드 전환.

#### 상태 추가

```typescript
type ScanMode = 'input' | 'barcode' | 'ocr';
const [scanMode, setScanMode] = useState<ScanMode>('input');

// OCR 전용 상태
const [ocrPhase, setOcrPhase] = useState<'preview' | 'processing' | 'result'>('preview');
const [ocrText, setOcrText] = useState('');
const [skuCandidates, setSkuCandidates] = useState<string[]>([]);
const ocrVideoRef = useRef<HTMLVideoElement>(null);
const ocrCanvasRef = useRef<HTMLCanvasElement>(null);
const ocrStreamRef = useRef<MediaStream | null>(null);
```

#### UI 변경

현재 하단 "카메라 사용" 버튼 영역을 **2개 버튼으로 교체**:

```
[📷 바코드 스캔] [📝 텍스트 스캔]
```

- `scanMode === 'input'`: 기존 텍스트 입력 + 하단에 2개 모드 버튼
- `scanMode === 'barcode'`: 기존 바코드 카메라 (변경 없음)
- `scanMode === 'ocr'`: OCR 카메라 프리뷰 + 캡처 버튼

#### OCR 모드 UI

```
┌─────────────────────────┐
│  [카메라 프리뷰]          │
│  ┌───────────────────┐   │
│  │ 가이드 오버레이     │   │  ← ocrPhase === 'preview'
│  └───────────────────┘   │
│  [📸 캡처]               │
├─────────────────────────┤
│  ⏳ 인식 중...           │  ← ocrPhase === 'processing'
├─────────────────────────┤
│  SKU 후보:               │  ← ocrPhase === 'result'
│  ┌─────────┐ ┌────────┐ │
│  │SKU-001 ✓│ │BDJ-M  ✓│ │  ← 클릭으로 선택 가능한 칩
│  └─────────┘ └────────┘ │
│  전체 텍스트:            │
│  [____editable input____]│
│  [다시 촬영]  [검색 실행] │
└─────────────────────────┘
```

#### OCR 핸들러

```typescript
const handleOcrCapture = async () => {
  // 1. 비디오 프레임 → 캔버스 캡처
  // 2. Tesseract.js 동적 import + 인식
  // 3. extractSkuCandidates() 호출
  // 4. 후보가 있으면 칩으로 표시
  // 5. 없으면 전체 텍스트 편집 모드
};

const handleSkuSelect = (sku: string) => {
  onScan(sku); // 기존 콜백 재사용
  setScanMode('input');
};

const handleOcrTextSubmit = () => {
  if (ocrText.trim()) {
    onScan(ocrText.trim());
    setScanMode('input');
  }
};
```

#### OCR 카메라 Lifecycle

기존 `OcrScanTab.tsx`의 카메라 시작/중지 패턴 재활용:
- `scanMode === 'ocr'` 진입 시 `getUserMedia({ facingMode: 'environment' })`
- 모드 변경/언마운트 시 stream.getTracks().stop()

### 2.3 `src/app/api/inventory/scan/route.ts` (MODIFY)

#### 변경: `candidates` 파라미터 추가

현재 `barcode` 1개로만 검색하는데, OCR에서 추출한 여러 SKU 후보를 한 번에 검색 가능하도록 확장.

```typescript
// scanQuerySchema 확장
export const scanQuerySchema = z.object({
  barcode: z.string().min(1).optional(),
  candidates: z.string().optional(), // comma-separated SKU candidates
}).refine(data => data.barcode || data.candidates, {
  message: 'barcode or candidates required',
});
```

#### 새로운 검색 로직

```typescript
if (candidates) {
  const skuList = candidates.split(',').map(s => s.trim()).filter(Boolean);

  // Batch SKU match
  const bySkus = await prisma.product.findMany({
    where: {
      sku: { in: skuList, mode: 'insensitive' },
      isActive: true,
    },
    select: selectFields,
  });

  if (bySkus.length > 0) {
    return NextResponse.json({ type: 'sku', products: bySkus });
  }

  // Fallback: 각 후보로 name contains 검색
  const byNames = await prisma.product.findMany({
    where: {
      OR: skuList.map(s => ({
        name: { contains: s, mode: 'insensitive' as const },
      })),
      isActive: true,
    },
    select: selectFields,
    take: 10,
  });

  return NextResponse.json({
    type: byNames.length > 0 ? 'name' : 'exact',
    products: byNames,
  });
}
```

### 2.4 `src/features/inventory/types/index.ts` (MODIFY)

```typescript
// 기존
export const scanQuerySchema = z.object({
  barcode: z.string().min(1),
});

// 변경
export const scanQuerySchema = z.object({
  barcode: z.string().min(1).optional(),
  candidates: z.string().optional(),
}).refine(data => data.barcode || data.candidates, {
  message: 'barcode or candidates is required',
});
```

### 2.5 `src/features/inventory/hooks/useScanProduct.ts` (MODIFY)

```typescript
interface ScanParams {
  barcode?: string | null;
  candidates?: string[] | null;
}

export function useScanProduct(params: ScanParams) {
  const { barcode, candidates } = params;
  const queryParams = new URLSearchParams();
  if (barcode) queryParams.set('barcode', barcode);
  if (candidates?.length) queryParams.set('candidates', candidates.join(','));

  return useQuery({
    queryKey: ['scan', barcode, candidates],
    queryFn: () => scanProduct(queryParams.toString()),
    enabled: !!(barcode || candidates?.length),
    staleTime: 30_000,
  });
}
```

**주의**: `register/page.tsx`에서 `useScanProduct` 호출 부분도 새 인터페이스에 맞게 업데이트 필요:
```typescript
// 기존: useScanProduct(scannedBarcode)
// 변경: useScanProduct({ barcode: scannedBarcode, candidates: skuCandidates })
```

### 2.6 i18n Keys

#### `src/messages/en/inventory.json` 추가:

```json
{
  "scan": {
    "textScan": "Text Scan",
    "barcodeScan": "Barcode Scan",
    "captureText": "Capture Text",
    "processing": "Recognizing text...",
    "skuCandidates": "SKU Candidates",
    "noSkuFound": "No SKU patterns detected. You can edit the text below.",
    "fullText": "Full Text",
    "retake": "Retake",
    "searchWithSku": "Search",
    "ocrHint": "Point camera at the SKU label and capture"
  }
}
```

#### `src/messages/ko/inventory.json` 추가:

```json
{
  "scan": {
    "textScan": "텍스트 스캔",
    "barcodeScan": "바코드 스캔",
    "captureText": "텍스트 캡처",
    "processing": "텍스트 인식 중...",
    "skuCandidates": "SKU 후보",
    "noSkuFound": "SKU 패턴이 감지되지 않았습니다. 아래 텍스트를 수정할 수 있습니다.",
    "fullText": "전체 텍스트",
    "retake": "다시 촬영",
    "searchWithSku": "검색",
    "ocrHint": "카메라를 SKU 라벨에 맞추고 캡처하세요"
  }
}
```

---

## 3. Implementation Order

| Step | File | Description |
|------|------|-------------|
| 1 | `src/lib/sku-detector.ts` | SKU 추출 유틸 생성 |
| 2 | `src/features/inventory/types/index.ts` | scanQuerySchema 확장 |
| 3 | `src/app/api/inventory/scan/route.ts` | candidates 파라미터 지원 |
| 4 | `src/features/inventory/hooks/useScanProduct.ts` | 새 인터페이스 적용 |
| 5 | `src/features/inventory/components/BarcodeScanner.tsx` | OCR 모드 통합 |
| 6 | `src/app/(dashboard)/inventory/register/page.tsx` | useScanProduct 호출 변경 |
| 7 | `src/messages/en/inventory.json` | i18n EN |
| 8 | `src/messages/ko/inventory.json` | i18n KO |

---

## 4. Edge Cases

| Case | Handling |
|------|----------|
| OCR 결과가 빈 문자열 | "텍스트가 인식되지 않았습니다" 메시지 + 재촬영 |
| SKU 후보 0개 | 전체 텍스트 편집 모드로 fallback |
| SKU 후보 여러 개 | 칩으로 나열, 사용자가 클릭으로 선택 |
| 선택한 SKU로 DB 매칭 0건 | "일치하는 제품이 없습니다" (기존 플로우) |
| 카메라 권한 거부 | 에러 메시지 + 텍스트 입력 모드로 복귀 |
| Tesseract 로딩 실패 | 에러 메시지 + 텍스트 입력 모드로 복귀 |

---

## 5. Testing Checklist

- [ ] OCR 모드에서 SKU 라벨 촬영 → SKU 후보 표시
- [ ] SKU 후보 클릭 → 제품 검색 → 매칭 결과 표시
- [ ] 바코드 모드 기존 동작 변경 없음
- [ ] 텍스트 입력 기존 동작 변경 없음
- [ ] candidates API: 여러 SKU → batch 검색 동작
- [ ] 카메라 권한 거부 시 graceful fallback
- [ ] 모바일(iPhone) + 데스크톱 크롬 모두 동작
- [ ] i18n EN/KO 전환 확인
- [ ] 다크 모드 UI 확인
