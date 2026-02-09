import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { vendorUpdateSchema } from '@/features/vendors/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          sku: true,
          imageUrl: true,
          price: true,
          productType: true,
          _count: { select: { inventoryItems: true } },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { products: true } },
    },
  });

  if (!vendor) {
    return apiError('NOT_FOUND', 'Vendor not found', 404);
  }

  return NextResponse.json({
    ...vendor,
    hasContact: !!(vendor.phone || vendor.email),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = vendorUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );

  try {
    const vendor = await prisma.vendor.update({
      where: { id },
      data: data as unknown as Prisma.VendorUpdateInput,
    });
    return NextResponse.json(vendor);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('not found')) {
      return apiError('NOT_FOUND', 'Vendor not found', 404);
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return apiError('CONFLICT', 'Vendor name already exists', 409);
    }
    throw err;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return apiError('NOT_FOUND', 'Vendor not found', 404);
  }
}
