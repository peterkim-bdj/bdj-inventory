'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductSearch({ value, onChange }: ProductSearchProps) {
  const t = useTranslations('products');
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, value, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={t('search.placeholder')}
      className="w-64 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
    />
  );
}
