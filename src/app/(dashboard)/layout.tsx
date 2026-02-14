import type { Metadata } from 'next';
import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';
import { DashboardShell } from './DashboardShell';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | BDJ Inventory' },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <DashboardShell userRole={session?.user?.role}>
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
