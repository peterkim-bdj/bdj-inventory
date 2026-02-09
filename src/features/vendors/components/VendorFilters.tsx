'use client';

import { useTranslations } from 'next-intl';

interface VendorFiltersProps {
  selectedHasContact: string;
  selectedIsActive: string;
  selectedAutoNotify: string;
  onHasContactChange: (val: string) => void;
  onIsActiveChange: (val: string) => void;
  onAutoNotifyChange: (val: string) => void;
}

export function VendorFilters({
  selectedHasContact,
  selectedIsActive,
  selectedAutoNotify,
  onHasContactChange,
  onIsActiveChange,
  onAutoNotifyChange,
}: VendorFiltersProps) {
  const t = useTranslations('vendors');

  const selectClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400';

  return (
    <>
      <select value={selectedHasContact} onChange={(e) => onHasContactChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allContact')}</option>
        <option value="true">{t('filter.hasContact')}</option>
        <option value="false">{t('filter.missingContact')}</option>
      </select>

      <select value={selectedIsActive} onChange={(e) => onIsActiveChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allStatus')}</option>
        <option value="true">{t('filter.active')}</option>
        <option value="false">{t('filter.inactive')}</option>
      </select>

      <select value={selectedAutoNotify} onChange={(e) => onAutoNotifyChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allNotify')}</option>
        <option value="true">{t('filter.notifyOn')}</option>
        <option value="false">{t('filter.notifyOff')}</option>
      </select>
    </>
  );
}
