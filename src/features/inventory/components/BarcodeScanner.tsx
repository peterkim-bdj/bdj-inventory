'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  autoFocus?: boolean;
}

export function BarcodeScanner({ onScan, autoFocus = true }: BarcodeScannerProps) {
  const t = useTranslations('inventory');
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [isCameraMode, setIsCameraMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraMode(true);

      // Try BarcodeDetector API
      if ('BarcodeDetector' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });

        const detectLoop = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              onScan(barcodes[0].rawValue);
              stopCamera();
              return;
            }
          } catch {
            // ignore detection errors
          }
          if (streamRef.current) {
            requestAnimationFrame(detectLoop);
          }
        };

        videoRef.current?.addEventListener('loadedmetadata', () => {
          detectLoop();
        });
      }
    } catch {
      setIsCameraMode(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScan]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraMode(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
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
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-lg placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-400"
          />
        </div>
      )}

      {isCameraMode && (
        <div className="relative overflow-hidden rounded-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video rounded-xl bg-black"
          />
          <button
            onClick={stopCamera}
            className="absolute bottom-3 right-3 rounded-full bg-black/70 px-4 py-2 text-sm text-white"
          >
            {t('scan.stopCamera')}
          </button>
        </div>
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
