import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api/error';
import { requireAuth } from '@/lib/auth';
import { read, utils } from 'xlsx';

const EXPECTED_COLUMNS = ['name', 'code', 'contactName', 'phone', 'email', 'website', 'address', 'notes', 'minLeadDays'];

interface ParsedRow extends Record<string, string | number> {
  rowNumber: number;
}

function parseSheet(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  // Auto-detect column mapping (pre-compute normalized headers for O(1) lookup)
  const headers = Object.keys(rows[0] || {});
  const normalizedHeaders = new Map(
    headers.map((h) => [h.toLowerCase().replace(/[\s_-]/g, ''), h])
  );
  const mapping: Record<string, string> = {};

  for (const expected of EXPECTED_COLUMNS) {
    const found = normalizedHeaders.get(expected.toLowerCase());
    if (found) mapping[expected] = found;
  }

  return rows.map((row, i) => {
    const mapped: Record<string, string | number> = {};
    for (const [target, source] of Object.entries(mapping)) {
      const val = row[source];
      if (target === 'minLeadDays') {
        mapped[target] = typeof val === 'number' ? val : parseInt(String(val)) || 3;
      } else {
        mapped[target] = String(val || '').trim();
      }
    }
    return { ...mapped, rowNumber: i + 2 };
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const action = formData.get('action') as string;

  if (!file) {
    return apiError('VALIDATION_ERROR', 'No file provided', 400);
  }

  const buffer = await file.arrayBuffer();
  const rows = parseSheet(buffer);

  if (action === 'preview') {
    const existingVendors = await prisma.vendor.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingVendors.map((v) => v.name.toLowerCase()));

    const previewRows = rows.map((row) => {
      const errors: Array<{ field: string; message: string }> = [];
      const name = String(row.name || '').trim();

      if (!name) {
        errors.push({ field: 'name', message: 'Name is required' });
      }

      const email = String(row.email || '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }

      let status: 'new' | 'duplicate' | 'error' = 'new';
      if (errors.length > 0) status = 'error';
      else if (name && existingNames.has(name.toLowerCase())) status = 'duplicate';

      return { ...row, rowNumber: row.rowNumber as number, status, errors };
    });

    return NextResponse.json({ rows: previewRows });
  }

  // Execute import
  const duplicateAction = formData.get('duplicateAction') as string || 'skip';
  const emptyValueAction = formData.get('emptyValueAction') as string || 'ignore';

  let created = 0, updated = 0, skipped = 0, errorCount = 0;
  const importErrors: Array<{ row: number; field: string; message: string }> = [];

  // Pre-fetch all existing vendors by name in one query (avoid N+1)
  const validNames = rows.map((r) => String(r.name || '').trim()).filter(Boolean);
  const existingVendors = validNames.length > 0
    ? await prisma.vendor.findMany({ where: { name: { in: validNames } }, select: { id: true, name: true } })
    : [];
  const existingMap = new Map(existingVendors.map((v) => [v.name, v]));

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) {
      errorCount++;
      importErrors.push({ row: row.rowNumber as number, field: 'name', message: 'Name is required' });
      continue;
    }

    const existing = existingMap.get(name);

    const data: Record<string, unknown> = {};
    for (const field of ['code', 'contactName', 'phone', 'email', 'website', 'address', 'notes']) {
      const val = String(row[field] || '').trim();
      if (val) {
        data[field] = val;
      } else if (emptyValueAction === 'overwrite') {
        data[field] = null;
      }
    }
    if (row.minLeadDays !== undefined) {
      data.minLeadDays = typeof row.minLeadDays === 'number' ? row.minLeadDays : 3;
    }

    try {
      if (existing) {
        if (duplicateAction === 'update') {
          await prisma.vendor.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          skipped++;
        }
      } else {
        const created_vendor = await prisma.vendor.create({ data: { name, ...data } });
        existingMap.set(name, { id: created_vendor.id, name });
        created++;
      }
    } catch {
      errorCount++;
      importErrors.push({ row: row.rowNumber as number, field: 'name', message: 'Database error' });
    }
  }

  return NextResponse.json({
    summary: { total: rows.length, created, updated, skipped, errors: errorCount },
    errors: importErrors,
  });
}
