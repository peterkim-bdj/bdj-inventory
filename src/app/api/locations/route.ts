import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { locationQuerySchema, locationCreateSchema } from '@/features/inventory/types';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = locationQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { parentId, includeInactive } = parsed.data;

  const where: Record<string, unknown> = {};
  if (parentId) where.parentId = parentId;
  if (includeInactive !== 'true') where.isActive = true;

  const locations = await prisma.location.findMany({
    where,
    orderBy: { code: 'asc' },
    include: {
      _count: { select: { inventoryItems: true } },
    },
  });

  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const body = await request.json();
  const parsed = locationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { name, code, parentId, level, description } = parsed.data;

  const location = await prisma.location.create({
    data: { name, code, parentId, level, description },
  });

  return NextResponse.json({ location }, { status: 201 });
}
