'use client';

import { FieldChanges } from './FieldChanges';

interface DiffItem {
  id: string;
  type: 'NEW' | 'MODIFIED' | 'REMOVED';
  data?: Record<string, unknown>;
  changes?: Array<{ field: string; old: string | number | null; new: string | number | null }>;
}

interface DiffItemRowProps {
  item: DiffItem;
  checked: boolean;
  onToggle: (id: string) => void;
}

export function DiffItemRow({ item, checked, onToggle }: DiffItemRowProps) {
  const name =
    item.type === 'MODIFIED'
      ? item.changes?.find((c) => c.field === 'name')?.old ?? '—'
      : (item.data?.name as string) ?? '—';
  const sku =
    item.type === 'MODIFIED'
      ? item.changes?.find((c) => c.field === 'sku')?.old ?? '—'
      : (item.data?.sku as string) ?? '—';

  return (
    <div className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
        className="mt-1 h-4 w-4 rounded border-zinc-300"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{String(name)}</span>
          <span className="text-xs text-zinc-500">{String(sku)}</span>
        </div>
        {item.type === 'NEW' && item.data && (
          <div className="mt-1 text-xs text-zinc-500">
            {item.data.vendorName ? <span>{String(item.data.vendorName)}</span> : null}
            {item.data.price ? <span className="ml-2">{String(item.data.price)}</span> : null}
          </div>
        )}
        {item.type === 'MODIFIED' && item.changes && (
          <FieldChanges changes={item.changes} />
        )}
      </div>
    </div>
  );
}
