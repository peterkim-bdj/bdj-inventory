import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { utils, write } from 'xlsx';

export async function GET() {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const wb = utils.book_new();
  const headers = ['name', 'code', 'contactName', 'phone', 'email', 'website', 'address', 'notes', 'minLeadDays'];
  const sampleRow = ['Nike Korea', 'NK-KR', 'Kim CS', '02-1234-5678', 'kim@nike.co.kr', '', 'Seoul, Korea', 'Mon AM preferred', 3];
  const ws = utils.aoa_to_sheet([headers, sampleRow]);

  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));

  utils.book_append_sheet(wb, ws, 'Vendors');
  const buf = write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="vendor-import-template.xlsx"',
    },
  });
}
