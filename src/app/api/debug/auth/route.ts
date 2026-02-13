import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Check env vars (mask values)
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : 'MISSING';
  checks.AUTH_URL = process.env.AUTH_URL ?? 'NOT SET';
  checks.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST ?? 'NOT SET';
  checks.AUTH_GOOGLE_ID = process.env.AUTH_GOOGLE_ID
    ? `set (${process.env.AUTH_GOOGLE_ID.substring(0, 10)}...)`
    : 'MISSING';
  checks.AUTH_GOOGLE_SECRET = process.env.AUTH_GOOGLE_SECRET
    ? `set (${process.env.AUTH_GOOGLE_SECRET.length} chars)`
    : 'MISSING';
  checks.DATABASE_URL = process.env.DATABASE_URL
    ? `set (${process.env.DATABASE_URL.substring(0, 30)}...)`
    : 'MISSING';

  // 2. Test DB connection
  try {
    const userCount = await prisma.user.count();
    checks.dbConnection = `OK (${userCount} users)`;
  } catch (e) {
    checks.dbConnection = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. Test adapter operations
  try {
    const account = await prisma.account.findFirst({
      where: { provider: 'google' },
      select: { provider: true, providerAccountId: true, userId: true },
    });
    checks.googleAccount = account ? `found (userId: ${account.userId})` : 'none found';
  } catch (e) {
    checks.googleAccount = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
