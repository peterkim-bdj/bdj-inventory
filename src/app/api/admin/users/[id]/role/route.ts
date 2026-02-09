import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  // Prevent self-demotion
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: 'Cannot change your own role' },
      { status: 400 },
    );
  }

  const body = await req.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
