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

interface BarcodeScanTabProps {
  onResult: (barcode: string) => void;
}

export function BarcodeScanTab({ onResult }: BarcodeScanTabProps) {
  const t = useTranslations('common');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let localScanner: Html5Qrcode | null = null;

    const initScanner = async () => {
      try {
        // Clear any leftover DOM from a previous instance (React strict mode)
        const readerEl = document.getElementById(READER_ID);
        if (readerEl) readerEl.innerHTML = '';

        const scanner = new Html5Qrcode(READER_ID, {
          formatsToSupport: BARCODE_FORMATS,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        localScanner = scanner;

        if (cancelled) return;

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
              onResult(decodedText);
              scanner.stop().catch(() => {});
              scannerRef.current = null;
            }
          },
          () => {
            // ignore per-frame scan failures
          },
        );

        if (!cancelled) {
          scannerRef.current = scanner;
          setIsStarting(false);
        } else {
          // Cancelled while starting — stop the running scanner
          try { scanner.stop().catch(() => {}); } catch {}
        }
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
      // Stop via ref (already started)
      if (scannerRef.current) {
        try { scannerRef.current.stop().catch(() => {}); } catch {}
        scannerRef.current = null;
      }
      // Stop via local variable (start may still be in-flight)
      if (localScanner && localScanner !== scannerRef.current) {
        try { localScanner.stop().catch(() => {}); } catch {}
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
          className="text-gray-300 dark:text-zinc-600 mb-3">
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
      <div id={READER_ID} className="w-full max-h-[50vh] overflow-hidden rounded-xl" />
      <p className="text-center text-xs text-gray-400">{t('scan.barcodeHint')}</p>
    </div>
  );
}
