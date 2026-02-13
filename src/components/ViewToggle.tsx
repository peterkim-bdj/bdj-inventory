'use client';

interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ViewToggleProps<T extends string> {
  view: T;
  onViewChange: (view: T) => void;
  options: ViewToggleOption<T>[];
}

export function ViewToggle<T extends string>({ view, onViewChange, options }: ViewToggleProps<T>) {
  return (
    <div className="flex rounded-full border border-gray-200 p-0.5 dark:border-zinc-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onViewChange(opt.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === opt.value
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
