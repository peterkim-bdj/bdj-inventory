'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';

interface VendorImportUploadProps {
  onFileSelect: (file: File) => void;
  isParsing: boolean;
}

export function VendorImportUpload({ onFileSelect, isParsing }: VendorImportUploadProps) {
  const t = useTranslations('vendors');

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) onFileSelect(accepted[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isParsing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer ${
          isDragActive
            ? 'border-black bg-gray-50 dark:border-white dark:bg-zinc-800'
            : 'border-gray-300 hover:border-gray-400 dark:border-zinc-700 dark:hover:border-zinc-500'
        } ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <p className="text-lg font-medium mb-1">
          {isDragActive ? t('import.dropHere') : t('import.dragOrClick')}
        </p>
        <p className="text-sm text-gray-400">{t('import.acceptedFormats')}</p>
      </div>

      <div className="flex justify-end">
        <a
          href="/api/vendors/import/template"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {t('import.downloadTemplate')}
        </a>
      </div>
    </div>
  );
}
