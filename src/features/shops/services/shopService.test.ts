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

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace('enc:', '')),
}));

import { prisma } from '@/lib/prisma';
import {
  getShops,
  getShopById,
  getShopCredentials,
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
  it('queries by id without accessToken', async () => {
    const mockShop = { id: '1', name: 'Shop A' };
    mockPrisma.shopifyStore.findUnique.mockResolvedValue(mockShop as never);

    const result = await getShopById('1');

    expect(result).toEqual(mockShop);
    expect(mockPrisma.shopifyStore.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '1' },
        select: expect.not.objectContaining({ accessToken: true }),
      }),
    );
  });

  it('returns null for non-existent shop', async () => {
    mockPrisma.shopifyStore.findUnique.mockResolvedValue(null as never);

    const result = await getShopById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('getShopCredentials', () => {
  it('returns shop with decrypted accessToken', async () => {
    const mockShop = { id: '1', domain: 'a.myshopify.com', accessToken: 'enc:shpat_xxx', apiVersion: '2025-01' };
    mockPrisma.shopifyStore.findUnique.mockResolvedValue(mockShop as never);

    const result = await getShopCredentials('1');

    expect(result).toBeDefined();
    expect(result!.accessToken).toBe('shpat_xxx');
  });
});

describe('createShop', () => {
  it('creates a shop with encrypted accessToken', async () => {
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
        data: expect.objectContaining({
          name: 'New Shop',
          domain: 'new.myshopify.com',
          accessToken: 'enc:shpat_xxx',
        }),
      }),
    );
  });
});

describe('updateShop', () => {
  it('updates shop fields without accessToken', async () => {
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

  it('encrypts accessToken when provided', async () => {
    const updated = { id: '1', name: 'Shop' };
    mockPrisma.shopifyStore.update.mockResolvedValue(updated as never);

    await updateShop('1', { accessToken: 'new_token' });

    expect(mockPrisma.shopifyStore.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessToken: 'enc:new_token',
        }),
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
