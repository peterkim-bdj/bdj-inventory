'use client';

import { useTranslations } from 'next-intl';

interface SyncStepperProps {
  phase: string;
}

const STEPS = ['fetching', 'processing', 'complete'] as const;

export function SyncStepper({ phase }: SyncStepperProps) {
  const t = useTranslations('sync.progress.stepper');

  const getStepIndex = () => {
    if (phase === 'fetching') return 0;
    if (phase === 'processing') return 1;
    if (phase === 'completing' || phase === 'complete') return 2;
    return -1; // error or idle
  };

  const currentIndex = getStepIndex();

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isError = phase === 'error';

        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isError
                    ? 'bg-red-400'
                    : isCompleted
                      ? 'bg-green-500'
                      : isActive
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-gray-300 dark:bg-zinc-600'
                }`}
              />
              <span
                className={`text-xs ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : isCompleted
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-zinc-500'
                }`}
              >
                {t(step)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-6 h-px ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
