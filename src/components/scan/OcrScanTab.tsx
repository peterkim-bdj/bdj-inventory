'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface OcrScanTabProps {
  onResult: (text: string) => void;
}

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
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_. /',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
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
        <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-zinc-600 dark:border-t-white" aria-hidden="true" />
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
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
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
