import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth(requiredRole?: 'ADMIN') {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    };
  }

  const role = session.user.role;

  if (role === 'PENDING') {
    return {
      error: NextResponse.json({ error: 'Account pending approval' }, { status: 403 }),
      session: null,
    };
  }

  if (requiredRole === 'ADMIN' && role !== 'ADMIN') {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
