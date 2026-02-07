import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              BDJ Inventory
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/shops" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.shops')}
              </Link>
              <Link href="/products" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.products')}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>
    </div>
  );
}
