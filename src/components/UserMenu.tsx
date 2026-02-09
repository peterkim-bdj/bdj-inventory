'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export function UserMenu() {
  const { data: session } = useSession();
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const initials = (session.user.name?.[0] || session.user.email?.[0] || '?').toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {session.user.image ? (
          <Image src={session.user.image} alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white dark:bg-white dark:text-black">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-gray-200 px-4 py-2 dark:border-zinc-700">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-gray-400">{session.user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            {t('button.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
