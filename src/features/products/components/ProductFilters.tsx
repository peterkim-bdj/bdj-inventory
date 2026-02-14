'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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

function SearchableSelect({
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedValue = selected.length === 1 ? selected[0] : '';
  const selectedOption = options.find((opt) => getId(opt) === selectedValue);
  const displayLabel = selectedOption ? `${getLabel(selectedOption)} (${selectedOption.count})` : label;

  const filtered = query
    ? options.filter((opt) => getLabel(opt).toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = useCallback((id: string) => {
    onChange(id ? [id] : []);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keyboard nav
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }, []);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:focus:ring-zinc-400 min-w-[120px] max-w-[200px] ${
          selectedValue
            ? 'border-black bg-black/5 dark:border-zinc-400 dark:bg-zinc-700'
            : 'border-gray-200 bg-white dark:bg-zinc-800 dark:border-zinc-700'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={label}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-zinc-400"
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {/* Clear / All option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                !selectedValue
                  ? 'bg-gray-100 font-medium dark:bg-zinc-700'
                  : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'
              }`}
            >
              {label}
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400">No results</p>
            ) : (
              filtered.map((opt) => {
                const id = getId(opt);
                const isSelected = id === selectedValue;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelect(id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'bg-gray-100 font-medium dark:bg-zinc-700'
                        : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <span>{getLabel(opt)}</span>
                    <span className="ml-1 text-gray-400">({opt.count})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
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
      <SearchableSelect
        label={t('filter.store')}
        options={filters.stores}
        selected={selectedStoreIds}
        onChange={onStoreChange}
        getId={(opt) => opt.id ?? ''}
        getLabel={(opt) => opt.name ?? ''}
      />
      <SearchableSelect
        label={t('filter.vendor')}
        options={filters.vendors}
        selected={selectedVendorIds}
        onChange={onVendorChange}
        getId={(opt) => opt.id ?? ''}
        getLabel={(opt) => opt.name ?? ''}
      />
      <SearchableSelect
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
