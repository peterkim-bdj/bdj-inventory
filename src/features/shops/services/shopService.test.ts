import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    shopifyStore: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  getShops,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
} from './shopService';

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getShops', () => {
  it('queries active shops ordered by createdAt desc', async () => {
    const mockShops = [
      { id: '1', name: 'Shop A', domain: 'a.myshopify.com' },
    ];
    mockPrisma.shopifyStore.findMany.mockResolvedValue(mockShops as never);

    const result = await getShops();

    expect(result).toEqual(mockShops);
    expect(mockPrisma.shopifyStore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});

describe('getShopById', () => {
  it('queries by id and includes accessToken', async () => {
    const mockShop = { id: '1', name: 'Shop A', accessToken: 'token' };
    mockPrisma.shopifyStore.findUnique.mockResolvedValue(mockShop as never);

    const result = await getShopById('1');

    expect(result).toEqual(mockShop);
    expect(mockPrisma.shopifyStore.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '1' },
        select: expect.objectContaining({ accessToken: true }),
      }),
    );
  });

  it('returns null for non-existent shop', async () => {
    mockPrisma.shopifyStore.findUnique.mockResolvedValue(null as never);

    const result = await getShopById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('createShop', () => {
  it('creates a shop with provided data', async () => {
    const input = {
      name: 'New Shop',
      domain: 'new.myshopify.com',
      accessToken: 'shpat_xxx',
      apiVersion: '2025-01',
    };
    const created = { id: 'new-1', ...input, syncStatus: 'NEVER' };
    mockPrisma.shopifyStore.create.mockResolvedValue(created as never);

    const result = await createShop(input);

    expect(result).toEqual(created);
    expect(mockPrisma.shopifyStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'New Shop',
          domain: 'new.myshopify.com',
          accessToken: 'shpat_xxx',
          apiVersion: '2025-01',
        },
      }),
    );
  });
});

describe('updateShop', () => {
  it('updates shop fields', async () => {
    const updated = { id: '1', name: 'Updated' };
    mockPrisma.shopifyStore.update.mockResolvedValue(updated as never);

    const result = await updateShop('1', { name: 'Updated' });

    expect(result).toEqual(updated);
    expect(mockPrisma.shopifyStore.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '1' },
        data: { name: 'Updated' },
      }),
    );
  });
});

describe('deleteShop', () => {
  it('soft-deletes shop and deactivates products', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      { id: '1', isActive: false },
      { count: 5 },
    ] as never);

    const result = await deleteShop('1');

    expect(result).toEqual({
      id: '1',
      isActive: false,
      deactivatedProducts: 5,
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
