'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface SearchableSelectProps {
  label: string;
  options: { id: string; label: string }[];
  selected: string;
  onChange: (val: string) => void;
}

function SearchableSelect({ label, options, selected, onChange }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === selected);
  const displayLabel = selectedOption ? selectedOption.label : label;

  const filtered = query
    ? options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  }, [onChange]);

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

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
          selected
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

          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                !selected
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
                const isSelected = opt.id === selected;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'bg-gray-100 font-medium dark:bg-zinc-700'
                        : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    {opt.label}
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

  const contactOptions = [
    { id: 'true', label: t('filter.hasContact') },
    { id: 'false', label: t('filter.missingContact') },
  ];

  const statusOptions = [
    { id: 'true', label: t('filter.active') },
    { id: 'false', label: t('filter.inactive') },
  ];

  const notifyOptions = [
    { id: 'true', label: t('filter.notifyOn') },
    { id: 'false', label: t('filter.notifyOff') },
  ];

  return (
    <>
      <SearchableSelect
        label={t('filter.allContact')}
        options={contactOptions}
        selected={selectedHasContact}
        onChange={onHasContactChange}
      />
      <SearchableSelect
        label={t('filter.allStatus')}
        options={statusOptions}
        selected={selectedIsActive}
        onChange={onIsActiveChange}
      />
      <SearchableSelect
        label={t('filter.allNotify')}
        options={notifyOptions}
        selected={selectedAutoNotify}
        onChange={onAutoNotifyChange}
      />
    </>
  );
}
