import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { inventoryActionSchema, inventoryDeleteSchema } from '@/features/inventory/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  const body = await request.json();
  const parsed = inventoryActionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid action', 400, {
      issues: parsed.error.issues,
    });
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) {
    return apiError('NOT_FOUND', 'Inventory item not found', 404);
  }

  const { action } = parsed.data;

  if (action === 'softDelete') {
    if (item.deletedAt) {
      return apiError('VALIDATION_ERROR', 'Item is already deleted', 400);
    }
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (action === 'restore') {
    if (!item.deletedAt) {
      return apiError('VALIDATION_ERROR', 'Item is not deleted', 400);
    }
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json(updated);
  }

  return apiError('VALIDATION_ERROR', 'Unknown action', 400);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  const body = await request.json();
  const parsed = inventoryDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Must confirm deletion with { confirm: true }', 400);
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) {
    return apiError('NOT_FOUND', 'Inventory item not found', 404);
  }

  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
