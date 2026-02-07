'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DiffItemRow } from './DiffItemRow';

interface DiffItem {
  id: string;
  type: 'NEW' | 'MODIFIED' | 'REMOVED';
  data?: Record<string, unknown>;
  changes?: Array<{ field: string; old: string | number | null; new: string | number | null }>;
  defaultAction: string;
}

interface DiffTabsProps {
  items: DiffItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (type: 'NEW' | 'MODIFIED' | 'REMOVED') => void;
  onDeselectAll: (type: 'NEW' | 'MODIFIED' | 'REMOVED') => void;
}

type TabType = 'NEW' | 'MODIFIED' | 'REMOVED';

export function DiffTabs({ items, selectedIds, onToggle, onSelectAll, onDeselectAll }: DiffTabsProps) {
  const t = useTranslations('sync');
  const [activeTab, setActiveTab] = useState<TabType>('NEW');

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'NEW', label: t('diff.new'), count: items.filter((i) => i.type === 'NEW').length },
    { key: 'MODIFIED', label: t('diff.modified'), count: items.filter((i) => i.type === 'MODIFIED').length },
    { key: 'REMOVED', label: t('diff.removed'), count: items.filter((i) => i.type === 'REMOVED').length },
  ];

  const filteredItems = items.filter((i) => i.type === activeTab);

  return (
    <div>
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filteredItems.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-xs">
          <button
            onClick={() => onSelectAll(activeTab)}
            className="text-blue-600 hover:underline"
          >
            {t('diff.selectAll')}
          </button>
          <button
            onClick={() => onDeselectAll(activeTab)}
            className="text-blue-600 hover:underline"
          >
            {t('diff.deselectAll')}
          </button>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            {t('diff.noItems')}
          </div>
        ) : (
          filteredItems.map((item) => (
            <DiffItemRow
              key={item.id}
              item={item}
              checked={selectedIds.has(item.id)}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
