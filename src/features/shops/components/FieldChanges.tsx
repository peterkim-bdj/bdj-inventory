'use client';

interface FieldChange {
  field: string;
  old: string | number | null;
  new: string | number | null;
}

interface FieldChangesProps {
  changes: FieldChange[];
}

export function FieldChanges({ changes }: FieldChangesProps) {
  return (
    <div className="mt-1 space-y-0.5">
      {changes.map((change) => (
        <div key={change.field} className="flex items-center gap-2 text-xs">
          <span className="w-24 font-medium text-zinc-500">{change.field}</span>
          <span className="line-through text-red-500">{String(change.old ?? '—')}</span>
          <span className="text-zinc-400">&rarr;</span>
          <span className="text-green-600">{String(change.new ?? '—')}</span>
        </div>
      ))}
    </div>
  );
}
