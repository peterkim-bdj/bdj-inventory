'use client';

import { useTranslations } from 'next-intl';
import type { FilterOption } from '../types';

interface ProductFiltersProps {
  filters: {
    stores: FilterOption[];
    vendors: FilterOption[];
    productTypes: FilterOption[];
  };
  selectedStoreIds: string[];
  selectedVendorIds: string[];
  selectedProductTypes: string[];
  onStoreChange: (ids: string[]) => void;
  onVendorChange: (ids: string[]) => void;
  onProductTypeChange: (types: string[]) => void;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  getId,
  getLabel,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  getId: (opt: FilterOption) => string;
  getLabel: (opt: FilterOption) => string;
}) {
  return (
    <select
      value={selected.length === 1 ? selected[0] : ''}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? [val] : []);
      }}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={getId(opt)} value={getId(opt)}>
          {getLabel(opt)} ({opt.count})
        </option>
      ))}
    </select>
  );
}

export function ProductFilters({
  filters,
  selectedStoreIds,
  selectedVendorIds,
  selectedProductTypes,
  onStoreChange,
  onVendorChange,
  onProductTypeChange,
}: ProductFiltersProps) {
  const t = useTranslations('products');

  return (
    <div className="flex flex-wrap gap-3">
      <MultiSelect
        label={t('filter.store')}
        options={filters.stores}
        selected={selectedStoreIds}
        onChange={onStoreChange}
        getId={(opt) => opt.id ?? ''}
        getLabel={(opt) => opt.name ?? ''}
      />
      <MultiSelect
        label={t('filter.vendor')}
        options={filters.vendors}
        selected={selectedVendorIds}
        onChange={onVendorChange}
        getId={(opt) => opt.id ?? ''}
        getLabel={(opt) => opt.name ?? ''}
      />
      <MultiSelect
        label={t('filter.productType')}
        options={filters.productTypes}
        selected={selectedProductTypes}
        onChange={onProductTypeChange}
        getId={(opt) => opt.value ?? ''}
        getLabel={(opt) => opt.value ?? ''}
      />
    </div>
  );
}
