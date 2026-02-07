'use client';

import { useTranslations } from 'next-intl';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations('products');

  return (
    <div className="flex rounded-md border">
      <button
        onClick={() => onViewChange('list')}
        className={`px-3 py-1.5 text-xs font-medium ${
          view === 'list'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-700'
        }`}
      >
        {t('view.list')}
      </button>
      <button
        onClick={() => onViewChange('card')}
        className={`px-3 py-1.5 text-xs font-medium border-l ${
          view === 'card'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-700'
        }`}
      >
        {t('view.card')}
      </button>
    </div>
  );
}
