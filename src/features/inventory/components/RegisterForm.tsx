'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocations } from '../hooks/useLocations';
import { ITEM_CONDITION } from '../types';

interface RegisterFormProps {
  productName: string;
  onSubmit: (data: {
    quantity: number;
    locationId?: string;
    condition: string;
    notes?: string;
  }) => void;
  isSubmitting: boolean;
}

export function RegisterForm({ productName, onSubmit, isSubmitting }: RegisterFormProps) {
  const t = useTranslations('inventory');
  const { data: locData } = useLocations();
  const [quantity, setQuantity] = useState(1);
  const [locationId, setLocationId] = useState('');
  const [condition, setCondition] = useState<string>('NEW');
  const [notes, setNotes] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      quantity,
      locationId: locationId || undefined,
      condition,
      notes: notes || undefined,
    });
  }, [quantity, locationId, condition, notes, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        {t('register.registeringFor', { product: productName })}
      </p>

      {/* Quantity */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.quantity')}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-lg dark:border-zinc-700"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center text-lg dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => setQuantity(Math.min(100, quantity + 1))}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-lg dark:border-zinc-700"
          >
            +
          </button>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.location')}
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{t('register.noLocation')}</option>
          {locData?.locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.code})
            </option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.condition')}
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {ITEM_CONDITION.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                condition === c
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'border border-gray-200 text-gray-500 dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              {t(`condition.${c}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          {t('register.notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder={t('register.notesPlaceholder')}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {isSubmitting
          ? t('register.registering')
          : t('register.submit', { count: quantity })
        }
      </button>
    </form>
  );
}
