'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  showingLabel?: string;
}

export function Pagination({ page, totalPages, total, limit, onPageChange, showingLabel }: PaginationProps) {
  const tCommon = useTranslations('common');

  const handlePrev = useCallback(() => onPageChange(Math.max(1, page - 1)), [onPageChange, page]);
  const handleNext = useCallback(() => onPageChange(Math.min(totalPages, page + 1)), [onPageChange, totalPages, page]);

  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-gray-400">
        {showingLabel ?? `${from}-${to} / ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          disabled={page <= 1}
          className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {tCommon('button.previous')}
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          const pageNum = start + i;
          if (pageNum > totalPages) return null;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[36px] h-9 rounded-full text-sm font-medium transition-colors ${
                pageNum === page
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {String(pageNum).padStart(2, '0')}
            </button>
          );
        })}
        <button
          onClick={handleNext}
          disabled={page >= totalPages}
          className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {tCommon('button.next')}
        </button>
      </div>
    </div>
  );
}
