'use client';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
  listLabel: string;
  cardLabel: string;
}

export function ViewToggle({ view, onViewChange, listLabel, cardLabel }: ViewToggleProps) {
  return (
    <div className="flex rounded-full border border-gray-200 p-0.5 dark:border-zinc-700">
      <button
        onClick={() => onViewChange('list')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          view === 'list'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        {listLabel}
      </button>
      <button
        onClick={() => onViewChange('card')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          view === 'card'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
        }`}
      >
        {cardLabel}
      </button>
    </div>
  );
}
