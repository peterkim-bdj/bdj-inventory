'use client';

import { useTranslations } from 'next-intl';
import { INVENTORY_STATUS } from '../types';
import type { InventoryFiltersMeta, LocationItem } from '../types';

interface InventoryFiltersProps {
  filtersMeta?: InventoryFiltersMeta;
  locations?: LocationItem[];
  selectedStatus: string;
  selectedLocationId: string;
  selectedStoreId: string;
  selectedVendorId: string;
  onStatusChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onStoreChange: (val: string) => void;
  onVendorChange: (val: string) => void;
}

export function InventoryFilters({
  filtersMeta,
  locations,
  selectedStatus,
  selectedLocationId,
  selectedStoreId,
  selectedVendorId,
  onStatusChange,
  onLocationChange,
  onStoreChange,
  onVendorChange,
}: InventoryFiltersProps) {
  const t = useTranslations('inventory');

  const selectClass = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400';

  return (
    <>
      <select value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allStatuses')}</option>
        {INVENTORY_STATUS.map((s) => (
          <option key={s} value={s}>{t(`status.${s}`)}</option>
        ))}
      </select>

      <select value={selectedLocationId} onChange={(e) => onLocationChange(e.target.value)} className={selectClass}>
        <option value="">{t('filter.allLocations')}</option>
        {locations?.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
        ))}
      </select>

      {filtersMeta?.stores && filtersMeta.stores.length > 0 && (
        <select value={selectedStoreId} onChange={(e) => onStoreChange(e.target.value)} className={selectClass}>
          <option value="">{t('filter.allStores')}</option>
          {filtersMeta.stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.count})</option>
          ))}
        </select>
      )}

      {filtersMeta?.vendors && filtersMeta.vendors.length > 0 && (
        <select value={selectedVendorId} onChange={(e) => onVendorChange(e.target.value)} className={selectClass}>
          <option value="">{t('filter.allVendors')}</option>
          {filtersMeta.vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name} ({v.count})</option>
          ))}
        </select>
      )}
    </>
  );
}
