'use client';

import { useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/components/Skeleton';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'PENDING' | 'USER' | 'ADMIN';
  createdAt: string;
}

const roleBadgeStyles: Record<string, string> = {
  ADMIN: 'bg-black text-white dark:bg-white dark:text-black',
  USER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ users: User[] }>;
    },
    staleTime: 2 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const mutationRef = useRef(mutation);
  mutationRef.current = mutation;

  const handleRoleChange = useCallback((id: string, role: string) => {
    mutationRef.current.mutate({ id, role });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('users.title')}</h1>

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:bg-zinc-800/50 dark:border-zinc-700">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.name')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.email')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.role')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.joined')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {data?.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <Image src={user.image} alt={user.name || user.email} width={32} height={32} className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold dark:bg-zinc-700">
                          {(user.name?.[0] || user.email[0]).toUpperCase()}
                        </div>
                      )}
                      {user.name || '-'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeStyles[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    {user.role === 'PENDING' && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'USER')}
                        className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                      >
                        {t('users.approve')}
                      </button>
                    )}
                    {user.role === 'USER' && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'ADMIN')}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        {t('users.promote')}
                      </button>
                    )}
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'USER')}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        {t('users.demote')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
