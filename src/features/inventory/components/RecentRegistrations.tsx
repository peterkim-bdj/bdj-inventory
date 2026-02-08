'use client';

import { useTranslations } from 'next-intl';
import type { RegisterResult } from '../types';

interface RecentRegistrationsProps {
  registrations: RegisterResult[];
  onPrintLabels: (items: Array<{ barcode: string }>, productName: string) => void;
}

export function RecentRegistrations({ registrations, onPrintLabels }: RecentRegistrationsProps) {
  const t = useTranslations('inventory');

  if (registrations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-gray-400 font-medium">
        {t('register.recentTitle')}
      </h3>
      {registrations.map((reg, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-gray-200 p-4 dark:border-zinc-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{reg.product.name}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {t('register.itemsCreated', { count: reg.items.length })}
              </p>
            </div>
            <button
              onClick={() => onPrintLabels(reg.items, reg.product.name)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-zinc-700 dark:text-zinc-400"
            >
              {t('register.printLabels')}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reg.items.map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono dark:bg-zinc-800"
              >
                {item.barcode}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
