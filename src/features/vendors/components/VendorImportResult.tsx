'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { VendorImportResult as VendorImportResultType } from '../types';

interface VendorImportResultProps {
  result: VendorImportResultType;
  onReset: () => void;
}

export function VendorImportResult({ result, onReset }: VendorImportResultProps) {
  const t = useTranslations('vendors');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 p-6 dark:border-zinc-800">
        <h3 className="text-lg font-bold mb-4">{t('import.resultTitle')}</h3>
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{result.summary.total}</p>
            <p className="text-xs text-gray-400">{t('import.total')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{result.summary.created}</p>
            <p className="text-xs text-gray-400">{t('import.created')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{result.summary.updated}</p>
            <p className="text-xs text-gray-400">{t('import.updated')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{result.summary.skipped}</p>
            <p className="text-xs text-gray-400">{t('import.skipped')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{result.summary.errors}</p>
            <p className="text-xs text-gray-400">{t('import.errors')}</p>
          </div>
        </div>
      </div>

      {/* Error details */}
      {result.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 p-4 dark:border-red-800">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">{t('import.errorDetails')}</h4>
          <ul className="text-sm space-y-1">
            {result.errors.map((err, i) => (
              <li key={i} className="text-red-600 dark:text-red-400">
                Row {err.row}: {err.field} - {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href="/vendors"
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
          {t('backToList')}
        </Link>
        <button onClick={onReset}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {t('import.importAnother')}
        </button>
      </div>
    </div>
  );
}
