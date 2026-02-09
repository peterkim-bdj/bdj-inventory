'use client';

import { useTranslations } from 'next-intl';

interface ShopDeleteDialogProps {
  shopName: string;
  productCount: number;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ShopDeleteDialog({
  shopName,
  productCount,
  isLoading,
  onConfirm,
  onCancel,
}: ShopDeleteDialogProps) {
  const t = useTranslations('shops');
  const tCommon = useTranslations('common');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-lg font-bold">{t('delete.title')}</h2>
        <p className="mt-2 text-sm text-gray-500">
          {t('delete.confirm', { count: productCount })}
        </p>
        <p className="mt-1 text-sm font-medium">{shopName}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {tCommon('button.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? tCommon('status.deleting') : tCommon('button.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
