'use client';

interface SyncProgressBarProps {
  percentage: number;
  indeterminate?: boolean;
  size?: 'sm' | 'md';
}

export function SyncProgressBar({ percentage, indeterminate, size = 'md' }: SyncProgressBarProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  if (indeterminate) {
    return (
      <div className={`w-full bg-gray-200 rounded-full ${height} dark:bg-zinc-700 overflow-hidden`}>
        <div
          className={`${height} rounded-full bg-blue-500 animate-indeterminate`}
          style={{ width: '30%' }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} dark:bg-zinc-700`}>
      <div
        className={`${height} rounded-full transition-all duration-300 ease-out ${
          percentage >= 100
            ? 'bg-green-500'
            : 'bg-blue-500'
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}
