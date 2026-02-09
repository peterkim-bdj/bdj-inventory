import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyDiff } from '@/features/shops/services/syncService';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';

const applySchema = z.object({
  syncLogId: z.string().min(1),
  actions: z.array(
    z.object({
      diffId: z.string().min(1),
      action: z.enum(['add', 'update', 'keep', 'deactivate']),
    }),
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = applySchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const result = await applyDiff(id, parsed.data.syncLogId, parsed.data.actions);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'No diff review in progress') {
      return apiError('SYNC_NOT_IN_DIFF_REVIEW', error.message, 400);
    }
    throw error;
  }
}
