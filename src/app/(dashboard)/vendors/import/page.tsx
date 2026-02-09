'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVendorImport } from '@/features/vendors/hooks/useVendorImport';
import { VendorImportUpload } from '@/features/vendors/components/VendorImportUpload';
import { VendorImportPreview } from '@/features/vendors/components/VendorImportPreview';
import { VendorImportResult } from '@/features/vendors/components/VendorImportResult';

export default function VendorImportPage() {
  const t = useTranslations('vendors');
  const {
    previewRows,
    isParsing,
    parseError,
    isImporting,
    importResult,
    importError,
    handleFileSelect,
    executeImport,
    reset,
  } = useVendorImport();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/vendors" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          &larr;
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('import.title')}</h1>
      </div>

      {(parseError || importError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {parseError || importError}
        </div>
      )}

      {importResult ? (
        <VendorImportResult result={importResult} onReset={reset} />
      ) : previewRows ? (
        <VendorImportPreview
          rows={previewRows}
          onExecute={executeImport}
          onCancel={reset}
          isImporting={isImporting}
        />
      ) : (
        <VendorImportUpload onFileSelect={handleFileSelect} isParsing={isParsing} />
      )}
    </div>
  );
}
