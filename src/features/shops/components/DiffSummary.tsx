'use client';

import { useTranslations } from 'next-intl';

interface DiffSummaryProps {
  summary: {
    new: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
}

export function DiffSummary({ summary }: DiffSummaryProps) {
  const t = useTranslations('sync');

  return (
    <div className="flex flex-wrap gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
        {t('diff.new')} {summary.new}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
        {t('diff.modified')} {summary.modified}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
        {t('diff.removed')} {summary.removed}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600">
        {t('diff.unchanged')} {summary.unchanged}
      </span>
    </div>
  );
}
