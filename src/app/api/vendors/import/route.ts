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

  // Auto-detect column mapping
  const headers = Object.keys(rows[0] || {});
  const mapping: Record<string, string> = {};

  for (const expected of EXPECTED_COLUMNS) {
    const found = headers.find((h) =>
      h.toLowerCase().replace(/[\s_-]/g, '') === expected.toLowerCase()
    );
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

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) {
      errorCount++;
      importErrors.push({ row: row.rowNumber as number, field: 'name', message: 'Name is required' });
      continue;
    }

    const existing = await prisma.vendor.findUnique({ where: { name } });

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
        await prisma.vendor.create({ data: { name, ...data } });
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
