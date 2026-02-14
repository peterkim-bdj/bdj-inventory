'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md dark:bg-red-900/10 dark:border-red-800">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
