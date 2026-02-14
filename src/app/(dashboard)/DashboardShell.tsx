'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';

export function DashboardShell({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole?: string;
}) {
  const t = useTranslations('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleToggleMobile = useCallback(() => setMobileMenuOpen((prev) => !prev), []);
  const handleCloseMobile = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4 md:gap-8">
            {/* Mobile hamburger */}
            <button
              onClick={handleToggleMobile}
              className="md:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                ) : (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                )}
              </svg>
            </button>
            <Link href="/" className="text-lg md:text-xl font-bold tracking-tight">
              BDJ Inventory
            </Link>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              {userRole === 'ADMIN' && (
                <Link href="/shops" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                  {t('nav.shops')}
                </Link>
              )}
              <Link href="/products" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.products')}
              </Link>
              <Link href="/vendors" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.vendors')}
              </Link>
              <Link href="/inventory" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                {t('nav.inventory')}
              </Link>
              {userRole === 'ADMIN' && (
                <Link href="/admin/users" className="text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                  {t('nav.admin')}
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 space-y-1">
            {userRole === 'ADMIN' && (
              <Link href="/shops" onClick={handleCloseMobile}
                className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
                {t('nav.shops')}
              </Link>
            )}
            <Link href="/products" onClick={handleCloseMobile}
              className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
              {t('nav.products')}
            </Link>
            <Link href="/vendors" onClick={handleCloseMobile}
              className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
              {t('nav.vendors')}
            </Link>
            <Link href="/inventory" onClick={handleCloseMobile}
              className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
              {t('nav.inventory')}
            </Link>
            {userRole === 'ADMIN' && (
              <Link href="/admin/users" onClick={handleCloseMobile}
                className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
                {t('nav.admin')}
              </Link>
            )}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
