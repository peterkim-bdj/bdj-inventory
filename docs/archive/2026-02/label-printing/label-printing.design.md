# label-printing Design Document

> **Summary**: Rollo X1040 라벨 프린터 연동 — 라벨 사이즈 프리셋, 배치 인쇄, CSS @page 정밀 출력
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-13
> **Plan Reference**: [label-printing.plan.md](../../01-plan/features/label-printing.plan.md)

---

## 1. Architecture Overview

### 1.1 변경 범위

기존 `LabelPrintView` + `Barcode` 컴포넌트를 개선하여 라벨 사이즈 선택, 사이즈 적응형 바코드, 배치 인쇄를 지원한다. 서버 API 변경 없음 — 모두 클라이언트 사이드.

```
[ Inventory Page ]
   ├── handlePrint(item)           ← 단일 아이템 (기존)
   ├── handleBatchPrint(items[])   ← 프로덕트 레벨 배치 (신규)
   │
   ▼
[ LabelPrintView (rewrite) ]
   ├── LabelSizeSelector           ← 프리셋 선택 UI
   ├── LabelPreview[]              ← 실제 비율 미리보기
   ├── PrintableLabels             ← @page CSS + window.print()
   └── useLabelSize() hook         ← localStorage 저장/로드
```

### 1.2 Data Flow

```
1. 사용자 프린트 버튼 클릭
   → setPrintData({ items: [...], productName })

2. LabelPrintView 마운트
   → useLabelSize() 에서 localStorage 로드 (또는 기본값 "2x1")
   → 선택된 사이즈로 바코드 파라미터 계산

3. 인쇄 버튼 클릭
   → <style> 태그에 동적 @page { size: Xin Yin } 삽입
   → window.print()
   → 각 라벨 = 1 page, page-break-after: always
```

---

## 2. Type Definitions

### 2.1 File: `src/features/inventory/types/index.ts` (MODIFY)

끝부분에 추가:

```typescript
// === Label Printing ===

export interface LabelSize {
  name: string;        // display name: "2\" x 1\"", "2.25\" x 1.25\"", etc.
  key: string;         // storage key: "2x1", "2.25x1.25", "4x6", "custom"
  width: number;       // inches
  height: number;      // inches
}

export const LABEL_PRESETS: LabelSize[] = [
  { name: '2" × 1"', key: '2x1', width: 2, height: 1 },
  { name: '2.25" × 1.25"', key: '2.25x1.25', width: 2.25, height: 1.25 },
  { name: '4" × 6"', key: '4x6', width: 4, height: 6 },
];

export const LABEL_SIZE_STORAGE_KEY = 'bdj-label-size';

/**
 * Calculate barcode rendering params based on label size.
 * DPI reference: 203 (Rollo X1040)
 */
export function getLabelBarcodeParams(label: LabelSize): {
  barcodeWidth: number;    // JsBarcode `width` (bar thickness multiplier)
  barcodeHeight: number;   // JsBarcode `height` (px)
  fontSize: number;        // JsBarcode `fontSize` (px)
  showProductName: boolean;
  productNameMaxChars: number;
  margin: number;          // JsBarcode `margin` (px)
} {
  const area = label.width * label.height;

  if (area <= 2.5) {
    // Small: 2x1 or similar
    return { barcodeWidth: 1.0, barcodeHeight: 30, fontSize: 8, showProductName: false, productNameMaxChars: 0, margin: 2 };
  } else if (area <= 4) {
    // Medium: 2.25x1.25 or similar
    return { barcodeWidth: 1.2, barcodeHeight: 40, fontSize: 9, showProductName: true, productNameMaxChars: 25, margin: 3 };
  } else {
    // Large: 4x6 or similar
    return { barcodeWidth: 2.0, barcodeHeight: 80, fontSize: 14, showProductName: true, productNameMaxChars: 50, margin: 4 };
  }
}
```

### 2.2 PrintData 확장 (Page에서 사용)

기존:
```typescript
{ items: Array<{ barcode: string }>; productName: string }
```

변경:
```typescript
export interface PrintLabelData {
  items: Array<{ barcode: string }>;
  productName: string;
}
```

타입만 명시적 인터페이스로 추출. 구조는 동일.

---

## 3. Hook: `useLabelSize`

### 3.1 File: `src/features/inventory/hooks/useLabelSize.ts` (NEW)

```typescript
'use client';

import { useState, useCallback } from 'react';
import { LABEL_PRESETS, LABEL_SIZE_STORAGE_KEY, type LabelSize } from '../types';

export function useLabelSize() {
  const [labelSize, setLabelSizeState] = useState<LabelSize>(() => {
    if (typeof window === 'undefined') return LABEL_PRESETS[0];

    try {
      const stored = localStorage.getItem(LABEL_SIZE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LabelSize;
        // Validate stored value
        if (parsed.width > 0 && parsed.height > 0) return parsed;
      }
    } catch { /* ignore */ }

    return LABEL_PRESETS[0]; // default: 2x1
  });

  const setLabelSize = useCallback((size: LabelSize) => {
    setLabelSizeState(size);
    try {
      localStorage.setItem(LABEL_SIZE_STORAGE_KEY, JSON.stringify(size));
    } catch { /* ignore */ }
  }, []);

  return { labelSize, setLabelSize };
}
```

---

## 4. Component: `LabelPrintView` (REWRITE)

### 4.1 File: `src/features/inventory/components/LabelPrintView.tsx`

**Props interface:**

```typescript
interface LabelPrintViewProps {
  items: Array<{ barcode: string }>;
  productName: string;
  onClose: () => void;
}
```

Props는 기존과 동일 — 호환성 유지.

**Component structure:**

```
LabelPrintView
├── Header: 타이틀 + 라벨 수 + 닫기 버튼
├── LabelSizeSelector: 프리셋 드롭다운 + 커스텀 입력
├── Preview area: 실제 비율로 라벨 미리보기 (스크롤)
├── Print button: "Print N labels"
├── PrintableLabels (hidden): @media print용 실제 출력 영역
└── <style>: 동적 @page CSS
```

**핵심 로직:**

```typescript
export function LabelPrintView({ items, productName, onClose }: LabelPrintViewProps) {
  const t = useTranslations('inventory');
  const { labelSize, setLabelSize } = useLabelSize();
  const barcodeParams = getLabelBarcodeParams(labelSize);

  const handlePrint = () => {
    window.print();
  };

  // ... render
}
```

### 4.2 LabelSizeSelector (inline sub-component)

프리셋 버튼 그룹 (pill toggle 형태):

```
[ 2"×1" ] [ 2.25"×1.25" ] [ 4"×6" ] [ Custom ▾ ]
```

- 프리셋 클릭 → `setLabelSize(preset)`
- Custom 선택 시 → width/height 인풋 노출 (inch 단위, step=0.25)
- 현재 선택은 강조 표시 (bg-black text-white)

### 4.3 Preview Layout

미리보기에서 라벨을 **실제 비율**로 표시:

```typescript
// Preview scaling: fit within max 200px width
const previewScale = Math.min(200 / (labelSize.width * 96), 1);
const previewWidth = labelSize.width * 96 * previewScale;   // 96 DPI screen
const previewHeight = labelSize.height * 96 * previewScale;
```

여러 개일 때:
- 가로로 나열 (flex-wrap)
- 3개 이상이면 2열 그리드
- 각 라벨에 인덱스 번호 표시 (1/3, 2/3, 3/3)

### 4.4 Print CSS (@page + @media print)

동적 `<style>` 태그:

```typescript
<style>{`
  @page {
    size: ${labelSize.width}in ${labelSize.height}in;
    margin: 0;
  }
  @media print {
    body * {
      visibility: hidden !important;
    }
    .print-labels,
    .print-labels * {
      visibility: visible !important;
    }
    .print-labels {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: ${labelSize.width}in !important;
      background: white !important;
      color: black !important;
      z-index: 99999 !important;
    }
    .label-item {
      width: ${labelSize.width}in;
      height: ${labelSize.height}in;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      background: white !important;
      color: black !important;
      overflow: hidden;
      box-sizing: border-box;
      padding: 0.05in;
    }
    .label-item:last-child {
      page-break-after: auto;
    }
    .label-item svg {
      display: inline-block !important;
      max-width: 95% !important;
    }
    .label-product-name {
      font-size: ${barcodeParams.fontSize - 2}px;
      color: black !important;
      margin-bottom: 2px;
      max-width: 95%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`}</style>
```

핵심:
- `@page { size }`: 정확한 라벨 사이즈를 프린터에 전달
- `page-break-after: always`: 각 라벨이 별도 페이지 (= 별도 라벨)
- 마지막 아이템은 `page-break-after: auto` (불필요한 빈 페이지 방지)

### 4.5 Complete JSX Structure

```tsx
return (
  <div className="fixed inset-0 z-50">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/30" onClick={onClose} />

    {/* Panel */}
    <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-zinc-900 rounded-l-xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">{t('labels.title')}</h2>
          <p className="text-sm text-gray-400">
            {t('labels.count', { count: items.length })}
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
          {/* X icon */}
        </button>
      </div>

      {/* Label Size Selector */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">{t('labels.size')}</p>
        <div className="flex flex-wrap gap-2">
          {LABEL_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setLabelSize(preset)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                labelSize.key === preset.key
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-zinc-600 dark:text-zinc-300'
              }`}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => setLabelSize({ name: 'Custom', key: 'custom', width: labelSize.width, height: labelSize.height })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              labelSize.key === 'custom'
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-zinc-600 dark:text-zinc-300'
            }`}
          >
            {t('labels.custom')}
          </button>
        </div>

        {/* Custom size inputs */}
        {labelSize.key === 'custom' && (
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={labelSize.width} step={0.25} min={1} max={4.1}
              onChange={(e) => setLabelSize({ ...labelSize, width: Number(e.target.value) })}
              className="w-20 rounded-lg border px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-600"
            />
            <span className="text-xs text-gray-400">×</span>
            <input type="number" value={labelSize.height} step={0.25} min={0.5} max={6}
              onChange={(e) => setLabelSize({ ...labelSize, height: Number(e.target.value) })}
              className="w-20 rounded-lg border px-2 py-1 text-sm dark:bg-zinc-800 dark:border-zinc-600"
            />
            <span className="text-xs text-gray-400">in</span>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">{t('labels.preview')}</p>
        <div className="flex flex-wrap gap-3">
          {items.map((item, idx) => (
            <div
              key={item.barcode}
              style={{ width: previewWidth, height: previewHeight }}
              className="border border-gray-200 dark:border-zinc-700 rounded flex flex-col items-center justify-center bg-white dark:bg-zinc-800 relative"
            >
              {items.length > 1 && (
                <span className="absolute top-0.5 right-1 text-[10px] text-gray-300">
                  {idx + 1}/{items.length}
                </span>
              )}
              {barcodeParams.showProductName && (
                <p className="text-[8px] text-gray-400 mb-0.5 truncate max-w-[90%]">
                  {productName.slice(0, barcodeParams.productNameMaxChars)}
                </p>
              )}
              <Barcode
                value={item.barcode}
                height={barcodeParams.barcodeHeight * previewScale}
                width={barcodeParams.barcodeWidth * previewScale}
                fontSize={barcodeParams.fontSize * previewScale}
                margin={barcodeParams.margin}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="w-full rounded-full bg-black py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {t('labels.printCount', { count: items.length })}
      </button>
    </div>

    {/* Hidden print area */}
    <div className="print-labels">
      {items.map((item) => (
        <div key={item.barcode} className="label-item">
          {barcodeParams.showProductName && (
            <p className="label-product-name">
              {productName.slice(0, barcodeParams.productNameMaxChars)}
            </p>
          )}
          <Barcode
            value={item.barcode}
            height={barcodeParams.barcodeHeight}
            width={barcodeParams.barcodeWidth}
            fontSize={barcodeParams.fontSize}
            margin={barcodeParams.margin}
          />
        </div>
      ))}
    </div>

    {/* Dynamic print styles */}
    <style>{/* ... @page + @media print CSS as shown in 4.4 */}</style>
  </div>
);
```

---

## 5. Barcode Component Update

### 5.1 File: `src/components/Barcode.tsx` (MODIFY)

`margin` prop 추가:

```typescript
interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  margin?: number;     // NEW - default 4
}

export function Barcode({ value, height = 40, width = 1.5, fontSize = 12, margin = 4 }: BarcodeProps) {
  // ...
  JsBarcode(svgRef.current, value, {
    format: 'CODE128',
    height,
    width,
    fontSize,
    margin,          // was hardcoded to 4
    displayValue: true,
  });
  // ...
}
```

기존 사용처는 `margin` 미전달 → 기본값 4 → 동작 변경 없음.

---

## 6. Batch Print: InventoryGroupedTable

### 6.1 File: `src/features/inventory/components/InventoryGroupedTable.tsx` (MODIFY)

**Props 확장:**

```typescript
interface InventoryGroupedTableProps {
  groups: ProductInventoryGroup[];
  onItemClick?: (id: string) => void;
  onProductClick?: (productId: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
  onBatchPrint?: (items: Array<{ barcode: string }>, productName: string) => void;  // NEW
}
```

**ProductGroupSection에 "Print All" 버튼 추가:**

`<td>` (4번째 열, vendorName 옆) 또는 hover 시 표시되는 프린트 아이콘.

구현: 프로덕트 행의 vendorName 옆에 프린트 아이콘 추가

```tsx
{onBatchPrint && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleBatchPrint(group);
    }}
    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-zinc-700"
    aria-label={t('labels.printAll')}
  >
    {/* Printer icon SVG */}
  </button>
)}
```

**Batch print handler in ProductGroupSection:**

`ExpandedItemRows`의 데이터를 재활용하여, 확장된 상태에서 아이템 데이터가 있으면 바로 사용.
확장되지 않은 상태에서는 → expand 먼저 → 데이터 로드 후 프린트.

간단한 접근: 배치 프린트 클릭 시 `expand` 트리거 + useInventory에서 해당 productId의 전체 아이템 fetch → barcodes 추출 → `onBatchPrint` 콜백.

더 간단한 접근 (추천): `ExpandedItemRows`에서 이미 fetch한 데이터를 상위로 올리기보다, **inventory page에서 직접 fetch**:

```typescript
// In InventoryGroupedTable:
const handleBatchPrint = useCallback(async (group: ProductInventoryGroup) => {
  // Fetch all items for this product
  const res = await fetch(`/api/inventory?productId=${group.product.id}&limit=100`);
  const data = await res.json();
  const barcodes = data.items.map((item: { barcode: string }) => ({ barcode: item.barcode }));
  onBatchPrint?.(barcodes, group.product.name);
}, [onBatchPrint]);
```

이 방식은 별도 hook 없이 간단하게 구현 가능. Limit 100으로 충분 (프로덕트당 인벤토리 100개 이하 가정).

---

## 7. Page Integration

### 7.1 File: `src/app/(dashboard)/inventory/page.tsx` (MODIFY)

**변경 사항:**

1. `handleBatchPrint` 핸들러 추가:

```typescript
const handleBatchPrint = useCallback((items: Array<{ barcode: string }>, productName: string) => {
  setPrintData({ items, productName });
}, []);
```

2. `InventoryGroupedTable`에 `onBatchPrint` prop 전달:

```tsx
<InventoryGroupedTable
  groups={groupedData!.groups}
  onItemClick={handleItemClick}
  onProductClick={handleProductClick}
  onPrint={handlePrint}
  onBatchPrint={handleBatchPrint}   // NEW
  filters={...}
/>
```

기존 `printData` state와 `LabelPrintView` 렌더링은 그대로 — `items`가 1개든 N개든 동일하게 동작.

---

## 8. i18n Keys

### 8.1 File: `src/messages/en/inventory.json` (MODIFY)

`labels` 섹션 확장:

```json
{
  "labels": {
    "title": "Print Labels",
    "print": "Print",
    "count": "{count, plural, one {# label} other {# labels}}",
    "printCount": "Print {count, plural, one {# Label} other {# Labels}}",
    "size": "Label Size",
    "custom": "Custom",
    "customWidth": "Width",
    "customHeight": "Height",
    "preview": "Preview",
    "printAll": "Print All Labels"
  }
}
```

### 8.2 File: `src/messages/ko/inventory.json` (MODIFY)

```json
{
  "labels": {
    "title": "라벨 출력",
    "print": "인쇄",
    "count": "{count}개 라벨",
    "printCount": "{count}개 라벨 인쇄",
    "size": "라벨 사이즈",
    "custom": "커스텀",
    "customWidth": "폭",
    "customHeight": "높이",
    "preview": "미리보기",
    "printAll": "전체 라벨 인쇄"
  }
}
```

---

## 9. Implementation Order

| Step | File(s) | Description | Depends On |
|:----:|---------|-------------|:----------:|
| 1 | `src/features/inventory/types/index.ts` | LabelSize 타입, LABEL_PRESETS, getLabelBarcodeParams | - |
| 2 | `src/features/inventory/hooks/useLabelSize.ts` | localStorage 기반 라벨 사이즈 상태 hook | Step 1 |
| 3 | `src/components/Barcode.tsx` | margin prop 추가 | - |
| 4 | `src/features/inventory/components/LabelPrintView.tsx` | 전체 리라이트 — 사이즈 선택, 미리보기, @page CSS | Steps 1-3 |
| 5 | `src/features/inventory/components/InventoryGroupedTable.tsx` | onBatchPrint prop + "Print All" 버튼 + fetch 로직 | - |
| 6 | `src/app/(dashboard)/inventory/page.tsx` | handleBatchPrint, onBatchPrint prop 연결 | Steps 4-5 |
| 7 | `src/messages/en/inventory.json`, `src/messages/ko/inventory.json` | 신규 i18n 키 추가 | - |

---

## 10. UI Wireframe

### 10.1 LabelPrintView Panel (Right slide)

```
┌─────────────────────────────┐
│ Print Labels           [X]  │
│ 3 labels                    │
│                             │
│ Label Size                  │
│ [2"×1"] [2.25"×1.25] [4×6] │
│ [Custom]                    │
│                             │
│ Preview                     │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 1/3  │ │ 2/3  │ │ 3/3  │ │
│ │▐▌▐▌▐▌│ │▐▌▐▌▐▌│ │▐▌▐▌▐▌│ │
│ │BDJ-..│ │BDJ-..│ │BDJ-..│ │
│ └──────┘ └──────┘ └──────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │     Print 3 Labels      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 10.2 Grouped Table with Batch Print Button

```
┌──────────────────────────────────────────────┐
│ Product          │ Qty │ Status  │ Actions    │
├──────────────────┼─────┼─────────┼────────────┤
│ ▶ Blue Jacket    │  3  │ ●3      │ Vendor [🖨] │
│ ▶ Red Shirt      │  1  │ ●1      │ Vendor [🖨] │
└──────────────────┴─────┴─────────┴────────────┘
          ↑ "Print All" button for batch print
```

---

## 11. Error Handling

| Scenario | Handling |
|----------|----------|
| localStorage 사용 불가 | 기본값 (2x1) 사용, 에러 무시 |
| 커스텀 사이즈 잘못 입력 | min/max 제한 (width: 1-4.1, height: 0.5-6) |
| Batch fetch 실패 | toast 에러 또는 console.error, 프린트 취소 |
| 아이템 0개 | 프린트 버튼 disabled |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-13 | Initial design | BDJ Team |
