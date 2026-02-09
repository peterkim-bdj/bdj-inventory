# Smart Search Design Document

> **Summary**: Products/Inventory 검색 입력에 카메라 스캔 기능 추가 (바코드 스캔 + OCR 텍스트 인식)
>
> **Project**: BDJ Inventory
> **Version**: 0.1.0
> **Author**: BDJ Team
> **Date**: 2026-02-08
> **Status**: Draft
> **Plan Doc**: [smart-search.plan.md](../../01-plan/features/smart-search.plan.md)

---

## 1. Architecture Overview

### 1.1 Component Hierarchy

```
SmartSearchInput (공통 검색 + 스캔 아이콘)
  └── ScanModal (모달 오버레이)
        ├── BarcodeScanTab (html5-qrcode 기반)
        └── OcrScanTab (Tesseract.js 기반)
```

### 1.2 File Map

| # | File | Type | Sprint |
|---|------|------|:------:|
| 1 | `src/components/SmartSearchInput.tsx` | NEW | 1 |
| 2 | `src/components/scan/ScanModal.tsx` | NEW | 1 |
| 3 | `src/components/scan/BarcodeScanTab.tsx` | NEW | 1 |
| 4 | `src/components/scan/OcrScanTab.tsx` | NEW | 2 |
| 5 | `src/app/(dashboard)/products/page.tsx` | MODIFY | 1 |
| 6 | `src/app/(dashboard)/inventory/page.tsx` | MODIFY | 1 |
| 7 | `src/messages/en/common.json` | MODIFY | 1 |
| 8 | `src/messages/ko/common.json` | MODIFY | 1 |

**Total**: 4 NEW + 4 MODIFY = 8 files

### 1.3 Dependencies

| Package | Version | Status | Usage |
|---------|---------|--------|-------|
| `html5-qrcode` | existing | Installed | Barcode scanning (16 formats) |
| `tesseract.js` | v5 | **NEW install** | OCR text recognition |

---

## 2. Detailed File Specifications

### 2.1 `src/components/SmartSearchInput.tsx` (NEW — Sprint 1)

**Purpose**: 공통 검색 입력 컴포넌트. 기존 ProductSearch/InventorySearch의 debounce 패턴 + 왼쪽 스캔 아이콘 추가.

**Props Interface**:

```typescript
interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;   // default: 300
}
```

**Behavior**:
- 내부 `local` state + debounce (기존 ProductSearch/InventorySearch 패턴 동일)
- 왼쪽: 스캔 아이콘 버튼 (viewfinder/scan SVG)
- 아이콘 클릭 → `ScanModal` 열림
- 스캔 결과 수신 → `local` state에 설정 → debounce 거쳐 `onChange` 호출
- 스캔 아이콘은 항상 표시 (카메라 없는 환경에서는 모달 내에서 안내)

**JSX Structure**:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScanModal } from '@/components/scan/ScanModal';

export function SmartSearchInput({
  value,
  onChange,
  placeholder = '',
  debounceMs = 300,
}: SmartSearchInputProps) {
  const [local, setLocal] = useState(value);
  const [showScanModal, setShowScanModal] = useState(false);

  // Debounce: local → parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, value, onChange, debounceMs]);

  // Sync parent → local
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleScanResult = useCallback((text: string) => {
    setLocal(text);
    setShowScanModal(false);
  }, []);

  return (
    <>
      <div className="relative">
        {/* Scan icon button (left) */}
        <button
          type="button"
          onClick={() => setShowScanModal(true)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Scan"
        >
          {/* Viewfinder SVG icon (scan) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        </button>

        {/* Search input */}
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="w-72 rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
            dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
      </div>

      {/* Scan Modal */}
      {showScanModal && (
        <ScanModal
          onResult={handleScanResult}
          onClose={() => setShowScanModal(false)}
        />
      )}
    </>
  );
}
```

**Styling Notes**:
- `pl-10` padding-left to accommodate scan icon
- `w-72` matches existing ProductSearch/InventorySearch width
- Existing `rounded-xl`, `focus:ring-black` conventions maintained

---

### 2.2 `src/components/scan/ScanModal.tsx` (NEW — Sprint 1)

**Purpose**: Full-screen 모달 오버레이. 바코드/OCR 탭 전환.

**Props Interface**:

```typescript
interface ScanModalProps {
  onResult: (text: string) => void;
  onClose: () => void;
}
```

**Behavior**:
- `activeTab` state: `'barcode' | 'ocr'` (기본: `'barcode'`)
- Escape key → `onClose()`
- 배경 클릭 → `onClose()`
- Sprint 1: OCR 탭은 `activeTab === 'ocr'`일 때 "Coming soon" placeholder
- Sprint 2: OcrScanTab 연결

**JSX Structure**:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { BarcodeScanTab } from './BarcodeScanTab';
// Sprint 2: import { OcrScanTab } from './OcrScanTab';

export function ScanModal({ onResult, onClose }: ScanModalProps) {
  const t = useTranslations('common');
  const [activeTab, setActiveTab] = useState<'barcode' | 'ocr'>('barcode');

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl">
        {/* Header with tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-5 py-4">
          <div className="flex gap-1 rounded-full border border-gray-200 dark:border-zinc-700 p-0.5">
            <button
              onClick={() => setActiveTab('barcode')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'barcode'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('scan.barcodeTab')}
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'ocr'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('scan.ocrTab')}
            </button>
          </div>

          {/* Close button */}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'barcode' ? (
            <BarcodeScanTab onResult={onResult} />
          ) : (
            <OcrScanTab onResult={onResult} />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Styling Notes**:
- Pill-shaped tab toggle matching ViewToggle pattern (`rounded-full`, `bg-black`/`text-white`)
- `max-w-lg` for modal width (적당한 모바일/데스크톱 크기)
- `rounded-2xl` for modal container (기존 design system보다 한 단계 더)

---

### 2.3 `src/components/scan/BarcodeScanTab.tsx` (NEW — Sprint 1)

**Purpose**: html5-qrcode 기반 바코드 스캔 탭. BarcodeScanner.tsx 패턴 재사용.

**Props Interface**:

```typescript
interface BarcodeScanTabProps {
  onResult: (barcode: string) => void;
}
```

**Behavior**:
- 마운트 시 자동으로 카메라 시작 (모달이 열렸을 때만 렌더링되므로)
- `Html5Qrcode` 인스턴스 생성 → `scanner.start({ facingMode: 'environment' })`
- 스캔 성공 시 `onResult(decodedText)` 호출
- 카메라 실패 시 에러 메시지 표시 (HTTPS 안내)
- 언마운트 시 `scanner.stop()` cleanup

**JSX Structure**:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.RSS_14,
  Html5QrcodeSupportedFormats.RSS_EXPANDED,
];

const READER_ID = 'smart-search-barcode-reader';

export function BarcodeScanTab({ onResult }: BarcodeScanTabProps) {
  const t = useTranslations('common');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initScanner = async () => {
      try {
        const scanner = new Html5Qrcode(READER_ID, {
          formatsToSupport: BARCODE_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => ({
              width: Math.floor(viewfinderWidth * 0.85),
              height: Math.floor(viewfinderHeight * 0.4),
            }),
            disableFlip: false,
          },
          (decodedText) => {
            if (!cancelled) {
              onResult(decodedText);
              scanner.stop().catch(() => {});
              scannerRef.current = null;
            }
          },
          () => {
            // ignore per-frame scan failures
          },
        );

        if (!cancelled) setIsStarting(false);
      } catch {
        if (!cancelled) {
          setError(t('scan.cameraUnavailable'));
          setIsStarting(false);
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-gray-300 mb-3">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isStarting && (
        <p className="text-center text-sm text-gray-400">{t('scan.starting')}</p>
      )}
      <div id={READER_ID} className="w-full overflow-hidden rounded-xl" />
      <p className="text-center text-xs text-gray-400">{t('scan.barcodeHint')}</p>
    </div>
  );
}
```

**Key Differences from BarcodeScanner.tsx**:
- 자동 카메라 시작 (모달 열림 = 렌더링 = 카메라 시작)
- 텍스트 입력 없음 (SmartSearchInput에 이미 있음)
- 카메라 토글 버튼 없음 (탭 전환 또는 모달 닫기로 대체)
- `READER_ID` 다른 값 사용 (기존 BarcodeScanner와 충돌 방지)

---

### 2.4 `src/components/scan/OcrScanTab.tsx` (NEW — Sprint 2)

**Purpose**: Tesseract.js 기반 OCR 텍스트 인식 탭.

**Props Interface**:

```typescript
interface OcrScanTabProps {
  onResult: (text: string) => void;
}
```

**Behavior**:
1. 카메라 프리뷰 표시 (`<video>` + `getUserMedia`)
2. "Capture" 버튼 클릭 → `<canvas>`에 프레임 캡처
3. Tesseract.js worker로 이미지 인식
4. 인식 결과 표시 → 사용자가 텍스트 수정 가능 → "Use" 버튼으로 확인
5. 확인 시 `onResult(finalText)` 호출

**States**:
- `phase`: `'preview' | 'processing' | 'result'`
- `recognizedText`: Tesseract 결과
- `editedText`: 사용자 수정 텍스트

**JSX Structure**:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

export function OcrScanTab({ onResult }: OcrScanTabProps) {
  const t = useTranslations('common');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'preview' | 'processing' | 'result'>('preview');
  const [recognizedText, setRecognizedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [error, setError] = useState('');

  // Start camera preview
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) {
          setError(t('scan.cameraUnavailable'));
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture frame and run OCR
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    setPhase('processing');

    try {
      // Dynamic import to avoid bundle bloat
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_. /',
        tessedit_pageseg_mode: '7', // Single text line
      });

      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      const trimmed = text.trim();
      setRecognizedText(trimmed);
      setEditedText(trimmed);
      setPhase('result');
    } catch {
      setError(t('scan.ocrFailed'));
      setPhase('preview');
    }
  }, [t]);

  // Confirm edited text
  const handleConfirm = useCallback(() => {
    if (editedText.trim()) {
      onResult(editedText.trim());
    }
  }, [editedText, onResult]);

  // Retry (back to preview)
  const handleRetry = useCallback(() => {
    setRecognizedText('');
    setEditedText('');
    setPhase('preview');
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {phase === 'preview' && (
        <>
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/60 rounded-lg w-4/5 h-12" />
            </div>
          </div>
          <p className="text-center text-xs text-gray-400">{t('scan.ocrHint')}</p>
          <button
            onClick={handleCapture}
            className="w-full rounded-full bg-black py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {t('scan.capture')}
          </button>
        </>
      )}

      {phase === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-zinc-600 dark:border-t-white" />
          <p className="mt-3 text-sm text-gray-500">{t('scan.processing')}</p>
        </div>
      )}

      {phase === 'result' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('scan.recognizedText')}
          </label>
          <input
            type="text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
              dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
          />
          {recognizedText !== editedText && (
            <p className="text-xs text-gray-400">{t('scan.originalText')}: {recognizedText}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
            >
              {t('scan.retry')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!editedText.trim()}
              className="flex-1 rounded-full bg-black py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {t('scan.useText')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**OCR Configuration**:
- `tessedit_char_whitelist`: 영숫자 + `-_. /` (SKU에 흔한 문자들)
- `tessedit_pageseg_mode: '7'`: 단일 텍스트 라인 모드 (SKU/상품명에 최적)
- `createWorker('eng')`: 영어 기본 (한국어 필요 시 `eng+kor` 가능, 향후 확장)
- Dynamic import: `import('tesseract.js')` — 번들 사이즈 최소화

**Guide Overlay**: 촬영 영역 안내선 (흰 테두리 박스) → 사용자가 텍스트를 중앙에 맞추도록 유도

---

### 2.5 `src/app/(dashboard)/products/page.tsx` (MODIFY — Sprint 1)

**Changes**: `ProductSearch` → `SmartSearchInput` 교체

**Before** (line 6, 74):
```tsx
import { ProductSearch } from '@/features/products/components/ProductSearch';
// ...
<ProductSearch value={search} onChange={handleSearchChange} />
```

**After**:
```tsx
import { SmartSearchInput } from '@/components/SmartSearchInput';
// ...
<SmartSearchInput
  value={search}
  onChange={handleSearchChange}
  placeholder={t('search.placeholder')}
/>
```

**Notes**:
- `placeholder` prop으로 기존 `products.search.placeholder` 키 전달
- 기존 `ProductSearch` 컴포넌트 파일은 유지 (다른 곳에서 사용 가능성)
- import만 변경, 나머지 로직 변경 없음

---

### 2.6 `src/app/(dashboard)/inventory/page.tsx` (MODIFY — Sprint 1)

**Changes**: `InventorySearch` → `SmartSearchInput` 교체

**Before** (line 12, 106):
```tsx
import { InventorySearch } from '@/features/inventory/components/InventorySearch';
// ...
<InventorySearch value={search} onChange={handleSearchChange} />
```

**After**:
```tsx
import { SmartSearchInput } from '@/components/SmartSearchInput';
// ...
<SmartSearchInput
  value={search}
  onChange={handleSearchChange}
  placeholder={t('search.placeholder')}
/>
```

**Notes**:
- 동일 패턴 — import 교체 + placeholder prop 추가
- 기존 `InventorySearch` 컴포넌트 파일은 유지

---

### 2.7 `src/messages/en/common.json` (MODIFY — Sprint 1+2)

**Add `scan` namespace**:

```json
{
  "scan": {
    "barcodeTab": "Barcode",
    "ocrTab": "Text (OCR)",
    "starting": "Starting camera...",
    "cameraUnavailable": "Camera requires HTTPS. Use text input instead.",
    "barcodeHint": "Point camera at barcode to scan automatically",
    "capture": "Capture Text",
    "processing": "Recognizing text...",
    "recognizedText": "Recognized Text",
    "originalText": "Original",
    "retry": "Retry",
    "useText": "Use This Text",
    "ocrHint": "Position text within the guide area, then capture",
    "ocrFailed": "Text recognition failed. Please try again."
  }
}
```

**Total new keys**: 13

---

### 2.8 `src/messages/ko/common.json` (MODIFY — Sprint 1+2)

**Add `scan` namespace**:

```json
{
  "scan": {
    "barcodeTab": "바코드",
    "ocrTab": "텍스트 (OCR)",
    "starting": "카메라 시작 중...",
    "cameraUnavailable": "카메라는 HTTPS가 필요합니다. 텍스트 입력을 사용하세요.",
    "barcodeHint": "바코드에 카메라를 맞추면 자동으로 스캔됩니다",
    "capture": "텍스트 캡처",
    "processing": "텍스트 인식 중...",
    "recognizedText": "인식된 텍스트",
    "originalText": "원본",
    "retry": "다시 시도",
    "useText": "이 텍스트 사용",
    "ocrHint": "가이드 영역 안에 텍스트를 맞춘 후 캡처하세요",
    "ocrFailed": "텍스트 인식에 실패했습니다. 다시 시도해 주세요."
  }
}
```

**Total new keys**: 13

---

## 3. Sprint Plan

### Sprint 1: SmartSearchInput + Barcode Scan (6 tasks)

| # | Task | Files | Notes |
|---|------|-------|-------|
| 1 | Create `SmartSearchInput` component | `SmartSearchInput.tsx` | Debounce + scan icon |
| 2 | Create `ScanModal` with tab UI | `scan/ScanModal.tsx` | Barcode tab active, OCR tab placeholder |
| 3 | Create `BarcodeScanTab` | `scan/BarcodeScanTab.tsx` | Auto-start camera, html5-qrcode |
| 4 | Apply to Products page | `products/page.tsx` | Import swap |
| 5 | Apply to Inventory page | `inventory/page.tsx` | Import swap |
| 6 | Add i18n keys (Sprint 1 subset) | `common.json` (en/ko) | `scan.barcodeTab`, `starting`, `cameraUnavailable`, `barcodeHint` |

### Sprint 2: OCR Tab + Result Confirmation (3 tasks)

| # | Task | Files | Notes |
|---|------|-------|-------|
| 1 | Install `tesseract.js` | `package.json` | `npm install tesseract.js` |
| 2 | Create `OcrScanTab` | `scan/OcrScanTab.tsx` | Camera preview, capture, Tesseract.js, result edit |
| 3 | Connect OCR tab in ScanModal + remaining i18n | `ScanModal.tsx`, `common.json` (en/ko) | Remove placeholder, add OCR keys |

---

## 4. Data Flow

### 4.1 Barcode Scan Flow

```
User clicks scan icon
  → SmartSearchInput opens ScanModal
    → ScanModal renders BarcodeScanTab
      → BarcodeScanTab auto-starts html5-qrcode
        → Camera scans barcode
          → onResult(decodedText) called
            → SmartSearchInput.handleScanResult(text)
              → setLocal(text) → debounce → onChange(text)
                → Parent page receives search value
                  → API call with search param
```

### 4.2 OCR Scan Flow

```
User clicks scan icon → opens ScanModal → selects OCR tab
  → OcrScanTab starts camera preview
    → User clicks "Capture"
      → Canvas captures video frame
        → Tesseract.js processes image
          → Result displayed in editable input
            → User edits text (optional)
              → User clicks "Use This Text"
                → onResult(editedText) called
                  → SmartSearchInput.handleScanResult(text)
                    → setLocal(text) → debounce → onChange(text)
```

---

## 5. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| HTTP environment (no camera) | `cameraUnavailable` 메시지 표시, 기존 텍스트 입력 계속 사용 가능 |
| Camera permission denied | 동일하게 `cameraUnavailable` 메시지 |
| OCR empty result | `editedText.trim()` 빈 문자열 → "Use" 버튼 disabled |
| OCR low confidence | 사용자가 수정 가능한 입력 필드 제공, 원본 텍스트 표시 |
| BarcodeScanner ID conflict | 다른 `READER_ID` 사용 (`smart-search-barcode-reader` vs `barcode-reader`) |
| Modal + Escape key | `window.addEventListener('keydown')` → cleanup on unmount |
| Multiple rapid scans | 첫 번째 스캔 결과만 적용 (`cancelled` flag) |

---

## 6. Existing Components Impact

| Component | Impact |
|-----------|--------|
| `ProductSearch.tsx` | 변경 없음 (파일 유지, import만 교체) |
| `InventorySearch.tsx` | 변경 없음 (파일 유지, import만 교체) |
| `BarcodeScanner.tsx` | 변경 없음 (등록 페이지 전용, 별도 유지) |
| `products/page.tsx` | import 1줄 + JSX 1줄 변경 |
| `inventory/page.tsx` | import 1줄 + JSX 1줄 변경 |

---

## 7. Bundle Size Considerations

| Resource | Strategy | Size Impact |
|----------|----------|-------------|
| `html5-qrcode` | Already installed | 0 |
| `tesseract.js` | Dynamic import (`import()`) | ~200KB (lazy, only when OCR tab opened) |
| Tesseract eng data | CDN (default) or bundled | ~1.5MB (downloaded on first OCR use, cached) |
| ScanModal | Rendered only when `showScanModal` is true | Minimal |

---

## 8. Success Criteria

- [ ] Products/Inventory 검색 입력에 스캔 아이콘 표시
- [ ] 아이콘 클릭 → 카메라 모달 열림 (바코드/OCR 탭)
- [ ] 바코드 스캔 → 검색어 자동 입력 + debounce 후 검색 실행
- [ ] OCR 촬영 → 텍스트 인식 → 수정 → 확인 → 검색어 입력
- [ ] Products/Inventory 양쪽에서 동일하게 동작
- [ ] Escape/배경 클릭으로 모달 닫기
- [ ] HTTPS 없는 환경에서 카메라 에러 메시지 표시
- [ ] `npm run build` 성공
- [ ] i18n en/ko 13개 키 완전 커버

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-08 | Initial design | BDJ Team |
