import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import type { CreateShopInput, UpdateShopInput } from '../types';

export async function getShops() {
  return prisma.shopifyStore.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      domain: true,
      apiVersion: true,
      productCount: true,
      lastSyncedAt: true,
      syncStatus: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function getShopById(id: string) {
  return prisma.shopifyStore.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      domain: true,
      apiVersion: true,
      productCount: true,
      lastSyncedAt: true,
      syncStatus: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Server-only: returns decrypted accessToken for sync operations. */
export async function getShopCredentials(id: string) {
  const shop = await prisma.shopifyStore.findUnique({
    where: { id },
    select: {
      id: true,
      domain: true,
      accessToken: true,
      apiVersion: true,
    },
  });
  if (!shop) return null;
  return {
    ...shop,
    accessToken: decrypt(shop.accessToken),
  };
}

export async function createShop(data: CreateShopInput) {
  return prisma.shopifyStore.create({
    data: {
      name: data.name,
      domain: data.domain,
      accessToken: encrypt(data.accessToken),
      apiVersion: data.apiVersion,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      apiVersion: true,
      syncStatus: true,
      productCount: true,
      lastSyncedAt: true,
      isActive: true,
    },
  });
}

export async function updateShop(id: string, data: UpdateShopInput) {
  const updateData = { ...data } as Record<string, unknown>;
  if (data.accessToken) {
    updateData.accessToken = encrypt(data.accessToken);
  }

  return prisma.shopifyStore.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      domain: true,
      apiVersion: true,
      syncStatus: true,
      productCount: true,
      lastSyncedAt: true,
      isActive: true,
    },
  });
}

export async function deleteShop(id: string) {
  const [, updatedProducts] = await prisma.$transaction([
    prisma.shopifyStore.update({
      where: { id },
      data: { isActive: false },
    }),
    prisma.product.updateMany({
      where: { shopifyStoreId: id },
      data: { shopifySynced: false },
    }),
  ]);

  return {
    id,
    isActive: false,
    deactivatedProducts: updatedProducts.count,
  };
}
