'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { extractSkuCandidates } from '@/lib/sku-detector';

// All 1D + 2D formats for maximum compatibility
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

type ScanMode = 'input' | 'barcode' | 'ocr';
type OcrPhase = 'preview' | 'processing' | 'result';

interface SuggestionProduct {
  id: string;
  name: string;
  sku: string | null;
  variantTitle: string | null;
  imageUrl: string | null;
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onSkuCandidates?: (candidates: string[]) => void;
  onProductSelect?: (productId: string, searchTerm: string) => void;
  autoFocus?: boolean;
}

const READER_ID = 'barcode-reader';

export function BarcodeScanner({ onScan, onSkuCandidates, onProductSelect, autoFocus = true }: BarcodeScannerProps) {
  const t = useTranslations('inventory');
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode>('input');
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Live search suggestions
  const [suggestions, setSuggestions] = useState<SuggestionProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // OCR state
  const [ocrPhase, setOcrPhase] = useState<OcrPhase>('preview');
  const [ocrText, setOcrText] = useState('');
  const [skuCandidates, setSkuCandidates] = useState<string[]>([]);
  const ocrVideoRef = useRef<HTMLVideoElement>(null);
  const ocrCanvasRef = useRef<HTMLCanvasElement>(null);
  const ocrStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && scanMode === 'input') {
      inputRef.current.focus();
    }
  }, [autoFocus, scanMode]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live search
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`/api/inventory/scan?barcode=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.products?.slice(0, 5) || []);
          setShowSuggestions(true);
        }
      } catch {
        // ignore fetch errors for suggestions
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 300);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    fetchSuggestions(v);
  }, [fetchSuggestions]);

  const handleSuggestionSelect = useCallback((product: SuggestionProduct) => {
    setShowSuggestions(false);
    setValue('');
    setSuggestions([]);
    if (onProductSelect) {
      onProductSelect(product.id, product.sku || product.name);
    } else {
      onScan(product.sku || product.name);
    }
  }, [onScan, onProductSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      setShowSuggestions(false);
      setSuggestions([]);
      onScan(value.trim());
      setValue('');
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [value, onScan]);

  // === Barcode Camera ===

  const stopBarcodeCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setScanMode('input');
  }, []);

  const startBarcodeCamera = useCallback(() => {
    setCameraError('');
    setScanMode('barcode');
  }, []);

  useEffect(() => {
    if (scanMode !== 'barcode') return;

    let cancelled = false;

    const initScanner = async () => {
      try {
        const scanner = new Html5Qrcode(READER_ID, {
          formatsToSupport: BARCODE_FORMATS,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => ({
              width: Math.floor(viewfinderWidth * 0.9),
              height: Math.floor(viewfinderHeight * 0.5),
            }),
            disableFlip: false,
            aspectRatio: 16 / 9,
          },
          (decodedText) => {
            if (!cancelled) {
              onScan(decodedText);
              scanner.stop().catch(() => {});
              scannerRef.current = null;
              setScanMode('input');
            }
          },
          () => {
            // ignore per-frame scan failures
          },
        );
      } catch {
        if (!cancelled) {
          setCameraError(t('scan.cameraUnavailable'));
          setScanMode('input');
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
  }, [scanMode]);

  // === OCR Camera ===

  const stopOcrCamera = useCallback(() => {
    if (ocrStreamRef.current) {
      ocrStreamRef.current.getTracks().forEach(track => track.stop());
      ocrStreamRef.current = null;
    }
    setOcrPhase('preview');
    setOcrText('');
    setSkuCandidates([]);
    setScanMode('input');
  }, []);

  const startOcrCamera = useCallback(() => {
    setCameraError('');
    setOcrPhase('preview');
    setOcrText('');
    setSkuCandidates([]);
    setScanMode('ocr');
  }, []);

  useEffect(() => {
    if (scanMode !== 'ocr') return;

    let cancelled = false;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        ocrStreamRef.current = stream;
        if (ocrVideoRef.current) {
          ocrVideoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) {
          setCameraError(t('scan.cameraUnavailable'));
          setScanMode('input');
        }
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      if (ocrStreamRef.current) {
        ocrStreamRef.current.getTracks().forEach(t => t.stop());
        ocrStreamRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode]);

  const handleOcrCapture = useCallback(async () => {
    if (!ocrVideoRef.current || !ocrCanvasRef.current) return;

    const video = ocrVideoRef.current;
    const canvas = ocrCanvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Crop to guide region (center 85% width, ~20% height strip)
    const cropW = Math.floor(vw * 0.85);
    const cropH = Math.floor(vh * 0.2);
    const cropX = Math.floor((vw - cropW) / 2);
    const cropY = Math.floor((vh - cropH) / 2);

    // Upscale 3x for better Tesseract accuracy on small text
    const scale = 3;
    canvas.width = cropW * scale;
    canvas.height = cropH * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing for sharp upscale
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW * scale, cropH * scale);

    // Preprocessing: grayscale + adaptive contrast (not binary threshold)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Pass 1: find min/max for contrast stretching
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    const range = max - min || 1;

    // Pass 2: contrast stretch + sharpen via sigmoid
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      // Normalize to 0-1, apply sigmoid for enhanced contrast
      const norm = (gray - min) / range;
      const sig = 1 / (1 + Math.exp(-12 * (norm - 0.5)));
      const val = Math.round(sig * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);

    setOcrPhase('processing');

    try {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_. /',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });

      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      const candidates = extractSkuCandidates(text);
      setOcrText(text.trim());
      setSkuCandidates(candidates);
      setOcrPhase('result');
    } catch {
      setCameraError(t('scan.cameraUnavailable'));
      stopOcrCamera();
    }
  }, [t, stopOcrCamera]);

  const handleSkuSelect = useCallback((sku: string) => {
    if (onSkuCandidates) {
      onSkuCandidates([sku]);
    } else {
      onScan(sku);
    }
    stopOcrCamera();
  }, [onScan, onSkuCandidates, stopOcrCamera]);

  const handleOcrTextSubmit = useCallback(() => {
    if (ocrText.trim()) {
      onScan(ocrText.trim());
      stopOcrCamera();
    }
  }, [ocrText, onScan, stopOcrCamera]);

  const handleOcrRetake = useCallback(() => {
    setOcrPhase('preview');
    setOcrText('');
    setSkuCandidates([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      if (ocrStreamRef.current) {
        ocrStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Text input mode with live suggestions */}
      {scanMode === 'input' && (
        <div className="relative" ref={wrapperRef}>
          <svg
            xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder={t('scan.placeholder')}
            suppressHydrationWarning
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-lg placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-400"
          />
          {value.length >= 2 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300 dark:text-zinc-600">
              {isFetchingSuggestions ? '...' : 'Enter'}
            </span>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSuggestionSelect(product)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-100 last:border-b-0 dark:border-zinc-800"
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs text-gray-400 flex-shrink-0 dark:bg-zinc-800 dark:text-zinc-500">
                      ?
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-zinc-100">
                      {product.name}
                      {product.variantTitle && (
                        <span className="font-normal text-gray-400 dark:text-zinc-500"> — {product.variantTitle}</span>
                      )}
                    </p>
                    {product.sku && (
                      <p className="truncate text-xs text-gray-400 font-mono dark:text-zinc-500">{product.sku}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barcode camera mode */}
      {scanMode === 'barcode' && (
        <div className="relative overflow-hidden rounded-xl">
          <div id={READER_ID} className="w-full" />
          <button
            onClick={stopBarcodeCamera}
            className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-4 py-2 text-sm text-white"
          >
            {t('scan.stopCamera')}
          </button>
        </div>
      )}

      {/* OCR camera mode */}
      {scanMode === 'ocr' && (
        <div className="space-y-3">
          {ocrPhase === 'preview' && (
            <div className="relative overflow-hidden rounded-xl">
              <video
                ref={ocrVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl"
              />
              {/* Guide overlay - strip matching crop region (85% width, ~20% height) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white/60 rounded-lg" style={{ width: '85%', height: '20%' }} />
              </div>
              <p className="absolute top-3 left-0 right-0 text-center text-xs text-white/80 bg-black/30 py-1">
                {t('scan.ocrHint')}
              </p>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                <button
                  onClick={handleOcrCapture}
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black shadow-lg"
                >
                  {t('scan.captureText')}
                </button>
                <button
                  onClick={stopOcrCamera}
                  className="rounded-full bg-black/70 px-4 py-2 text-sm text-white"
                >
                  {t('scan.stopCamera')}
                </button>
              </div>
            </div>
          )}

          {ocrPhase === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-gray-200 dark:border-zinc-700">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-zinc-600 dark:border-t-white" />
              <p className="mt-3 text-sm text-gray-500">{t('scan.processing')}</p>
            </div>
          )}

          {ocrPhase === 'result' && (
            <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-zinc-700">
              {skuCandidates.length > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                    {t('scan.skuCandidates')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skuCandidates.map((sku) => (
                      <button
                        key={sku}
                        onClick={() => handleSkuSelect(sku)}
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-mono font-medium transition-colors hover:border-black hover:bg-black hover:text-white dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                      >
                        {sku}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('scan.noSkuFound')}</p>
              )}

              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1">
                  {t('scan.fullText')}
                </p>
                <input
                  type="text"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleOcrRetake}
                  className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {t('scan.retake')}
                </button>
                <button
                  onClick={handleOcrTextSubmit}
                  className="flex-1 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {t('scan.searchWithSku')}
                </button>
              </div>
            </div>
          )}

          <canvas ref={ocrCanvasRef} className="hidden" />
        </div>
      )}

      {cameraError && (
        <p className="text-sm text-red-500">{cameraError}</p>
      )}

      {/* Mode buttons */}
      {scanMode === 'input' && (
        <div className="flex gap-2">
          <button
            onClick={startBarcodeCamera}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" y1="12" x2="17" y2="12" />
            </svg>
            {t('scan.barcodeScan')}
          </button>
          <button
            onClick={startOcrCamera}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {t('scan.textScan')}
          </button>
        </div>
      )}
    </div>
  );
}
