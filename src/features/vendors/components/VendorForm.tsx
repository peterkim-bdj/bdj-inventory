'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateVendor, useUpdateVendor } from '../hooks/useVendorMutation';
import type { VendorDetail } from '../types';

interface VendorFormProps {
  vendor?: VendorDetail;
}

export function VendorForm({ vendor }: VendorFormProps) {
  const t = useTranslations('vendors');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const isEdit = !!vendor;

  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    code: vendor?.code ?? '',
    contactName: vendor?.contactName ?? '',
    phone: vendor?.phone ?? '',
    email: vendor?.email ?? '',
    website: vendor?.website ?? '',
    address: vendor?.address ?? '',
    notes: vendor?.notes ?? '',
    autoNotify: vendor?.autoNotify ?? false,
    minLeadDays: vendor?.minLeadDays ?? 3,
  });
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: vendor.id, data: form });
        router.push(`/vendors/${vendor.id}`);
      } else {
        const created = await createMutation.mutateAsync(form);
        router.push(`/vendors/${created.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name (required) */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.name')} *</label>
        <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
          required className={inputClass} />
      </div>

      {/* Code */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.code')}</label>
        <input type="text" value={form.code} onChange={(e) => handleChange('code', e.target.value)}
          placeholder="e.g., NK-KR" className={inputClass} />
      </div>

      {/* Contact Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.contactName')}</label>
        <input type="text" value={form.contactName} onChange={(e) => handleChange('contactName', e.target.value)}
          className={inputClass} />
      </div>

      {/* Phone + Email row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.phone')}</label>
          <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
            className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.email')}</label>
          <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
            className={inputClass} />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.website')}</label>
        <input type="url" value={form.website} onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://" className={inputClass} />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.address')}</label>
        <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)}
          className={inputClass} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)}
          rows={3} placeholder={t('form.notesPlaceholder')} className={inputClass} />
      </div>

      {/* Lead time + Auto notify row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.minLeadDays')}</label>
          <input type="number" value={form.minLeadDays} min={0} max={365}
            onChange={(e) => handleChange('minLeadDays', parseInt(e.target.value) || 0)}
            className={inputClass} />
        </div>
        <div className="flex items-center pt-7">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.autoNotify}
              onChange={(e) => handleChange('autoNotify', e.target.checked)}
              className="rounded border-gray-300" />
            {t('form.autoNotify')}
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <button type="submit" disabled={isPending}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200">
          {isPending ? tCommon('status.saving') : isEdit ? tCommon('button.save') : t('addVendor')}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {tCommon('button.cancel')}
        </button>
      </div>
    </form>
  );
}
