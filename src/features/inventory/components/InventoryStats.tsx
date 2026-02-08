'use client';

import { useTranslations } from 'next-intl';

interface InventoryStatsProps {
  stats: {
    byStatus: Array<{ status: string; count: number }>;
    total: number;
  };
}

export function InventoryStats({ stats }: InventoryStatsProps) {
  const t = useTranslations('inventory');

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    RESERVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    SOLD: 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-400',
    RETURNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DAMAGED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {stats.byStatus.map((s) => (
        <div
          key={s.status}
          className={`rounded-xl p-4 ${statusColors[s.status] ?? 'bg-gray-100'}`}
        >
          <p className="text-2xl font-bold">{s.count}</p>
          <p className="text-xs">{t(`status.${s.status}`)}</p>
        </div>
      ))}
    </div>
  );
}
