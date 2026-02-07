import { prisma } from './prisma';

export function generateBarcodePrefix(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BDJ-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateUniqueBarcodePrefix(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const prefix = generateBarcodePrefix();
    const existing = await prisma.product.findUnique({
      where: { barcodePrefix: prefix },
      select: { id: true },
    });
    if (!existing) return prefix;
  }
  throw new Error('Failed to generate unique barcode prefix after 10 attempts');
}
