'use client';

import { useTranslations } from 'next-intl';

const QUICK_FILTERS = [
  { key: 'missingSku', translationKey: 'missingSku', value: 'true' },
  { key: 'missingSku', translationKey: 'hasSku', value: 'false' },
  { key: 'missingBarcode', translationKey: 'missingBarcode', value: 'true' },
  { key: 'missingBarcode', translationKey: 'hasBarcode', value: 'false' },
  { key: 'missingPrice', translationKey: 'missingPrice', value: 'true' },
  { key: 'missingImage', translationKey: 'missingImage', value: 'true' },
] as const;

interface QuickFiltersProps {
  activeFilters: Record<string, string>;
  onToggle: (key: string, value: string) => void;
}

export function QuickFilters({ activeFilters, onToggle }: QuickFiltersProps) {
  const t = useTranslations('products');

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((filter) => {
        const isActive = activeFilters[filter.key] === filter.value;
        return (
          <button
            key={filter.translationKey}
            onClick={() => onToggle(filter.key, filter.value)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              isActive
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            {t(`quickFilter.${filter.translationKey}`)}
          </button>
        );
      })}
    </div>
  );
}
