import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b bg-white dark:bg-zinc-900">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold">
              BDJ Inventory
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/shops" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.shops')}
              </Link>
              <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.products')}
              </Link>
            </nav>
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>
    </div>
  );
}
