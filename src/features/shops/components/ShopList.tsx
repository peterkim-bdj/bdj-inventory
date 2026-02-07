'use client';

import { useTranslations } from 'next-intl';
import { useFormatter } from 'next-intl';
import { useShops, useDeleteShop } from '../hooks/useShops';
import Link from 'next/link';
import { useState } from 'react';
import { ShopDeleteDialog } from './ShopDeleteDialog';
import { SyncButton } from './SyncButton';

export function ShopList() {
  const t = useTranslations('shops');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const { data: shops, isLoading } = useShops();
  const deleteMutation = useDeleteShop();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; productCount: number } | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">{tCommon('status.loading')}</p>;
  }

  if (!shops || shops.length === 0) {
    return <p className="text-muted-foreground">{tCommon('status.noData')}</p>;
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NEVER: 'bg-zinc-100 text-zinc-600',
      SYNCED: 'bg-green-100 text-green-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      DIFF_REVIEW: 'bg-yellow-100 text-yellow-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      NEVER: t('status.never'),
      SYNCED: t('status.synced'),
      IN_PROGRESS: t('status.inProgress'),
      DIFF_REVIEW: t('status.diffReview'),
      FAILED: t('status.failed'),
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ''}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left font-medium">{t('form.name')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('list.domain')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('list.productCount')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('list.lastSynced')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('list.syncStatus')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('list.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id} className="border-b last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium">{shop.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{shop.domain}</td>
                <td className="px-4 py-3 text-right">{shop.productCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {shop.lastSyncedAt
                    ? format.dateTime(new Date(shop.lastSyncedAt), { dateStyle: 'medium', timeStyle: 'short' })
                    : t('list.neverSynced')}
                </td>
                <td className="px-4 py-3">{statusBadge(shop.syncStatus)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <SyncButton shopId={shop.id} syncStatus={shop.syncStatus} />
                    <Link
                      href={`/shops/${shop.id}/edit`}
                      className="rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {tCommon('button.edit')}
                    </Link>
                    <button
                      onClick={() => setDeleteTarget({ id: shop.id, name: shop.name, productCount: shop.productCount })}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      {tCommon('button.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ShopDeleteDialog
          shopName={deleteTarget.name}
          productCount={deleteTarget.productCount}
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
