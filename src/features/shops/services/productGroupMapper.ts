import { prisma } from '@/lib/prisma';

export async function mapProductToGroup(productId: string): Promise<string | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      sku: true,
      shopifyBarcode: true,
      name: true,
      productType: true,
      vendorId: true,
      shopifyStoreId: true,
    },
  });

  if (!product) return null;

  // 1. Try matching by SKU
  if (product.sku) {
    const existingGroup = await prisma.productGroup.findUnique({
      where: { canonicalSku: product.sku },
    });

    if (existingGroup) {
      await prisma.product.update({
        where: { id: productId },
        data: { productGroupId: existingGroup.id },
      });
      return existingGroup.id;
    }

    // Look for another product in a different store with the same SKU
    const sibling = await prisma.product.findFirst({
      where: {
        sku: product.sku,
        id: { not: productId },
        shopifyStoreId: { not: product.shopifyStoreId },
        isActive: true,
      },
      select: { id: true, productGroupId: true },
    });

    if (sibling) {
      if (sibling.productGroupId) {
        await prisma.product.update({
          where: { id: productId },
          data: { productGroupId: sibling.productGroupId },
        });
        return sibling.productGroupId;
      }

      // Create new group and link both
      const group = await prisma.productGroup.create({
        data: {
          canonicalSku: product.sku,
          name: product.name,
          productType: product.productType,
          vendorId: product.vendorId,
        },
      });

      await prisma.product.updateMany({
        where: { id: { in: [productId, sibling.id] } },
        data: { productGroupId: group.id },
      });

      return group.id;
    }
  }

  // 2. Try matching by barcode
  if (product.shopifyBarcode) {
    const existingGroup = await prisma.productGroup.findUnique({
      where: { canonicalBarcode: product.shopifyBarcode },
    });

    if (existingGroup) {
      await prisma.product.update({
        where: { id: productId },
        data: { productGroupId: existingGroup.id },
      });
      return existingGroup.id;
    }

    const sibling = await prisma.product.findFirst({
      where: {
        shopifyBarcode: product.shopifyBarcode,
        id: { not: productId },
        shopifyStoreId: { not: product.shopifyStoreId },
        isActive: true,
      },
      select: { id: true, productGroupId: true },
    });

    if (sibling) {
      if (sibling.productGroupId) {
        await prisma.product.update({
          where: { id: productId },
          data: { productGroupId: sibling.productGroupId },
        });
        return sibling.productGroupId;
      }

      const group = await prisma.productGroup.create({
        data: {
          canonicalBarcode: product.shopifyBarcode,
          name: product.name,
          productType: product.productType,
          vendorId: product.vendorId,
        },
      });

      await prisma.product.updateMany({
        where: { id: { in: [productId, sibling.id] } },
        data: { productGroupId: group.id },
      });

      return group.id;
    }
  }

  // No match found
  return null;
}
