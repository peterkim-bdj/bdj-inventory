'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createShopSchema, type CreateShopInput, type CreateShopFormValues } from '../types';

interface ShopFormProps {
  defaultValues?: Partial<CreateShopFormValues>;
  onSubmit: (data: CreateShopInput) => void;
  isLoading: boolean;
  submitLabel?: string;
}

export function ShopForm({ defaultValues, onSubmit, isLoading, submitLabel }: ShopFormProps) {
  const t = useTranslations('shops');
  const tCommon = useTranslations('common');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateShopFormValues, unknown, CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      apiVersion: '2025-01',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t('form.name')}</label>
        <input
          {...register('name')}
          placeholder={t('form.namePlaceholder')}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('form.domain')}</label>
        <input
          {...register('domain')}
          placeholder={t('form.domainPlaceholder')}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        {errors.domain && (
          <p className="mt-1 text-xs text-red-600">{errors.domain.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('form.accessToken')}</label>
        <input
          {...register('accessToken')}
          type="password"
          placeholder={t('form.accessTokenPlaceholder')}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        {errors.accessToken && (
          <p className="mt-1 text-xs text-red-600">{errors.accessToken.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('form.apiVersion')}</label>
        <input
          {...register('apiVersion')}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {isLoading ? tCommon('status.saving') : (submitLabel ?? tCommon('button.save'))}
        </button>
      </div>
    </form>
  );
}
