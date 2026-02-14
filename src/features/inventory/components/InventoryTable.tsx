'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Barcode } from '@/components/Barcode';
import { useInventoryMutation } from '../hooks/useInventoryMutation';
import type { InventoryItemDetail } from '../types';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESERVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOLD: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400',
  RETURNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DAMAGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface InventoryTableProps {
  items: InventoryItemDetail[];
  onItemClick?: (id: string) => void;
  onProductClick?: (productId: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
  isAdmin?: boolean;
  isTrash?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function InventoryTable({ items, onItemClick, onProductClick, onPrint, isAdmin, isTrash, selectedIds, onSelectionChange }: InventoryTableProps) {
  const t = useTranslations('inventory');
  const { softDelete, restore, permanentDelete } = useInventoryMutation();

  const showCheckboxes = isTrash && isAdmin && onSelectionChange;
  const allSelected = showCheckboxes && items.length > 0 && items.every((i) => selectedIds?.has(i.id));
  const someSelected = showCheckboxes && items.some((i) => selectedIds?.has(i.id));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map((i) => i.id)));
    }
  };

  const handleSelectItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const handleSoftDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('delete.confirmDelete'))) return;
    await softDelete.mutateAsync(id);
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await restore.mutateAsync(id);
  };

  const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('delete.confirmPermanentDelete'))) return;
    await permanentDelete.mutateAsync(id);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-800/50">
            {showCheckboxes && (
              <th className="pl-4 pr-1 py-3 w-10">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  ref={(el) => { if (el) el.indeterminate = !!someSelected && !allSelected; }}
                  onChange={handleSelectAll}
                  aria-label={t('table.selectAll', { defaultValue: 'Select all' })}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </th>
            )}
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.product')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.barcode')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.location')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.status')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">{t('table.condition')}</th>
            <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
              {isTrash ? t('delete.deletedAt') : t('table.receivedAt')}
            </th>
            <th className="px-5 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isChecked = selectedIds?.has(item.id) ?? false;
            return (
              <tr
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
                className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30 ${onItemClick ? 'cursor-pointer' : ''} ${isChecked ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
              >
                {showCheckboxes && (
                  <td className="pl-4 pr-1 py-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by onClick
                      onClick={(e) => handleSelectItem(e, item.id)}
                      aria-label={`${t('table.select', { defaultValue: 'Select' })} ${item.product.name}`}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {item.product.imageUrl ? (
                      <Image src={item.product.imageUrl} alt={item.product.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-800" />
                    )}
                    <div>
                      <p
                        className={`font-medium truncate max-w-[200px] ${onProductClick ? 'hover:underline cursor-pointer' : ''}`}
                        onClick={(e) => { if (onProductClick) { e.stopPropagation(); onProductClick(item.product.id); } }}
                      >
                        {item.product.name}
                        {item.product.variantTitle && (
                          <span className="ml-1 font-normal text-gray-400">— {item.product.variantTitle}</span>
                        )}
                      </p>
                      {item.product.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Barcode value={item.barcode} height={24} width={1} fontSize={9} />
                </td>
                <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                  {item.location ? `${item.location.name} (${item.location.code})` : '\u2014'}
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status] ?? ''}`}>
                    {t(`status.${item.status}`)}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{t(`condition.${item.condition}`)}</td>
                <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                  {isTrash && item.deletedAt
                    ? new Date(item.deletedAt).toLocaleDateString()
                    : new Date(item.receivedAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    {isTrash && isAdmin ? (
                      <>
                        <button
                          onClick={(e) => handleRestore(e, item.id)}
                          className="rounded-full p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          aria-label={t('delete.restore')}
                          title={t('delete.restore')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, item.id)}
                          className="rounded-full p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          aria-label={t('delete.permanentDelete')}
                          title={t('delete.permanentDelete')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        {onPrint && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onPrint(item); }}
                            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            aria-label={t('detail.print')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => handleSoftDelete(e, item.id)}
                            className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            aria-label={t('delete.delete')}
                            title={t('delete.softDelete')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
