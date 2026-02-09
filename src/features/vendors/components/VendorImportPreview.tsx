'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { VendorImportPreviewRow } from '../types';

interface VendorImportPreviewProps {
  rows: VendorImportPreviewRow[];
  onExecute: (options: { duplicateAction: 'skip' | 'update'; emptyValueAction: 'ignore' | 'overwrite' }) => void;
  onCancel: () => void;
  isImporting: boolean;
}

const statusBadge: Record<string, string> = {
  new: 'bg-green-100 text-green-700',
  duplicate: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export function VendorImportPreview({ rows, onExecute, onCancel, isImporting }: VendorImportPreviewProps) {
  const t = useTranslations('vendors');
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [emptyValueAction, setEmptyValueAction] = useState<'ignore' | 'overwrite'>('ignore');

  const newCount = rows.filter((r) => r.status === 'new').length;
  const dupCount = rows.filter((r) => r.status === 'duplicate').length;
  const errCount = rows.filter((r) => r.status === 'error').length;

  const selectClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{t('import.newCount', { count: newCount })}</span>
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">{t('import.dupCount', { count: dupCount })}</span>
        <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{t('import.errCount', { count: errCount })}</span>
      </div>

      {/* Options */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-gray-400">{t('import.duplicateAction')}</label>
          <select value={duplicateAction} onChange={(e) => setDuplicateAction(e.target.value as 'skip' | 'update')} className={selectClass}>
            <option value="skip">{t('import.skip')}</option>
            <option value="update">{t('import.update')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">{t('import.emptyValueAction')}</label>
          <select value={emptyValueAction} onChange={(e) => setEmptyValueAction(e.target.value as 'ignore' | 'overwrite')} className={selectClass}>
            <option value="ignore">{t('import.ignoreEmpty')}</option>
            <option value="overwrite">{t('import.overwriteEmpty')}</option>
          </select>
        </div>
      </div>

      {/* Preview table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700 max-h-96">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('import.status')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.name')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.code')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.contactName')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.phone')}</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('form.email')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-zinc-800">
                <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[row.status]}`}>
                    {t(`import.${row.status}`)}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-gray-500">{row.code || ''}</td>
                <td className="px-3 py-2 text-gray-500">{row.contactName || ''}</td>
                <td className="px-3 py-2 text-gray-500">{row.phone || ''}</td>
                <td className="px-3 py-2 text-gray-500">{row.email || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onExecute({ duplicateAction, emptyValueAction })}
          disabled={isImporting || errCount === rows.length}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {isImporting ? t('import.importing') : t('import.execute')}
        </button>
        <button onClick={onCancel}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {t('import.cancel')}
        </button>
      </div>
    </div>
  );
}
