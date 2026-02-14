import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const batchActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['restore', 'permanentDelete']),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const body = await request.json();
  const parsed = batchActionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid batch action', 400, {
      issues: parsed.error.issues,
    });
  }

  const { ids, action } = parsed.data;

  if (action === 'restore') {
    const result = await prisma.inventoryItem.updateMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    return NextResponse.json({ success: true, count: result.count });
  }

  if (action === 'permanentDelete') {
    const result = await prisma.inventoryItem.deleteMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
    });
    return NextResponse.json({ success: true, count: result.count });
  }

  return apiError('VALIDATION_ERROR', 'Unknown action', 400);
}
