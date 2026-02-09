import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { vendorQuerySchema, vendorCreateSchema } from '@/features/vendors/types';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = vendorQuerySchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, {
      issues: parsed.error.issues,
    });
  }

  const { search, hasContact, isActive, autoNotify, sortBy, sortOrder, page, limit } = parsed.data;

  const where: Prisma.VendorWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (hasContact === 'true') {
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        },
        {
          OR: [{ phone: { not: null } }, { email: { not: null } }],
        },
      ];
      delete where.OR;
    } else {
      where.OR = [{ phone: { not: null } }, { email: { not: null } }];
    }
  } else if (hasContact === 'false') {
    where.phone = null;
    where.email = null;
  }

  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (autoNotify !== undefined) where.autoNotify = autoNotify === 'true';

  // Sort
  let orderBy: Prisma.VendorOrderByWithRelationInput | Prisma.VendorOrderByWithRelationInput[];
  const dir = sortOrder ?? 'asc';

  if (sortBy === 'productCount') {
    orderBy = { products: { _count: dir } };
  } else if (sortBy === 'minLeadDays') {
    orderBy = { minLeadDays: dir };
  } else if (sortBy === 'contactStatus') {
    orderBy = [{ phone: dir === 'asc' ? 'asc' : 'desc' }, { name: 'asc' }];
  } else {
    orderBy = { name: dir };
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        contactName: true,
        phone: true,
        email: true,
        autoNotify: true,
        minLeadDays: true,
        isActive: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  const items = vendors.map((v) => ({
    ...v,
    hasContact: !!(v.phone || v.email),
  }));

  return NextResponse.json({
    vendors: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const body = await request.json();
  const parsed = vendorCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
      issues: parsed.error.issues,
    });
  }

  const { name, code, contactName, phone, email, website, address, notes, autoNotify, minLeadDays } = parsed.data;

  try {
    const vendor = await prisma.vendor.create({
      data: {
        name,
        code: code || null,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        notes: notes || null,
        autoNotify,
        minLeadDays,
      },
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return apiError('CONFLICT', 'Vendor name already exists', 409);
    }
    throw err;
  }
}
