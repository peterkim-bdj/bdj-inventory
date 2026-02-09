'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  autoFocus?: boolean;
}

const READER_ID = 'barcode-reader';

export function BarcodeScanner({ onScan, autoFocus = true }: BarcodeScannerProps) {
  const t = useTranslations('inventory');
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && !isCameraMode) {
      inputRef.current.focus();
    }
  }, [autoFocus, isCameraMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
      setValue('');
    }
  }, [value, onScan]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsCameraMode(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setIsCameraMode(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start scanner after container div is mounted
  useEffect(() => {
    if (!isCameraMode) return;

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
              setIsCameraMode(false);
            }
          },
          () => {
            // ignore per-frame scan failures
          },
        );
      } catch {
        if (!cancelled) {
          setCameraError(t('scan.cameraUnavailable'));
          setIsCameraMode(false);
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
  }, [isCameraMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {!isCameraMode && (
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
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
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('scan.placeholder')}
            suppressHydrationWarning
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-lg placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-400"
          />
        </div>
      )}

      {isCameraMode && (
        <div className="relative overflow-hidden rounded-xl">
          <div id={READER_ID} className="w-full" />
          <button
            onClick={stopCamera}
            className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-4 py-2 text-sm text-white"
          >
            {t('scan.stopCamera')}
          </button>
        </div>
      )}

      {cameraError && (
        <p className="text-sm text-red-500">{cameraError}</p>
      )}

      <button
        onClick={isCameraMode ? stopCamera : startCamera}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {isCameraMode ? t('scan.stopCamera') : t('scan.useCamera')}
      </button>
    </div>
  );
}
