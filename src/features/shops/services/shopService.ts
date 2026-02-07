import { prisma } from '@/lib/prisma';
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
      accessToken: true,
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

export async function createShop(data: CreateShopInput) {
  return prisma.shopifyStore.create({
    data: {
      name: data.name,
      domain: data.domain,
      accessToken: data.accessToken,
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
  return prisma.shopifyStore.update({
    where: { id },
    data,
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
