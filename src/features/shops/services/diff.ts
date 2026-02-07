import type { TransformedProduct } from '@/lib/shopify/types';

export interface FieldChange {
  field: string;
  old: string | number | null;
  new: string | number | null;
}

export interface DiffItem {
  id: string;
  type: 'NEW' | 'MODIFIED' | 'REMOVED';
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productId?: string;
  data?: Record<string, unknown>;
  changes?: FieldChange[];
  defaultAction: 'add' | 'update' | 'keep';
}

export interface DiffSummary {
  newCount: number;
  modifiedCount: number;
  removedCount: number;
  unchangedCount: number;
  totalFetched: number;
}

interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  shopifyBarcode: string | null;
  productType: string | null;
  price: unknown;
  compareAtPrice: unknown;
  imageUrl: string | null;
  vendorName: string | null;
  variantTitle: string | null;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
}

const COMPARE_FIELDS = [
  'name',
  'description',
  'sku',
  'shopifyBarcode',
  'productType',
  'price',
  'compareAtPrice',
  'imageUrl',
  'vendorName',
  'variantTitle',
] as const;

export function generateDiff(
  shopifyProducts: TransformedProduct[],
  dbProducts: DbProduct[],
): { items: DiffItem[]; summary: DiffSummary } {
  const diff: DiffItem[] = [];
  let unchangedCount = 0;

  const dbMap = new Map(
    dbProducts.map((p) => [`${p.shopifyProductId}:${p.shopifyVariantId}`, p]),
  );
  const shopifyKeys = new Set<string>();

  for (const sp of shopifyProducts) {
    const key = `${sp.shopifyProductId}:${sp.shopifyVariantId}`;
    shopifyKeys.add(key);
    const dbProduct = dbMap.get(key);

    if (!dbProduct) {
      diff.push({
        id: `new_${key}`,
        type: 'NEW',
        shopifyProductId: sp.shopifyProductId,
        shopifyVariantId: sp.shopifyVariantId,
        data: sp as unknown as Record<string, unknown>,
        defaultAction: 'add',
      });
    } else {
      const changes: FieldChange[] = [];
      for (const field of COMPARE_FIELDS) {
        const oldVal = String(
          (dbProduct as unknown as Record<string, unknown>)[field] ?? '',
        );
        const newVal = String(
          (sp as unknown as Record<string, unknown>)[field] ?? '',
        );
        if (oldVal !== newVal) {
          changes.push({
            field,
            old: (dbProduct as unknown as Record<string, unknown>)[field] as
              | string
              | number
              | null,
            new: (sp as unknown as Record<string, unknown>)[field] as
              | string
              | number
              | null,
          });
        }
      }

      if (changes.length > 0) {
        diff.push({
          id: `mod_${key}`,
          type: 'MODIFIED',
          productId: dbProduct.id,
          shopifyProductId: sp.shopifyProductId,
          shopifyVariantId: sp.shopifyVariantId,
          changes,
          defaultAction: 'update',
        });
      } else {
        unchangedCount++;
      }
    }
  }

  for (const [key, dbProduct] of dbMap) {
    if (!shopifyKeys.has(key)) {
      diff.push({
        id: `rem_${key}`,
        type: 'REMOVED',
        productId: dbProduct.id,
        data: { name: dbProduct.name, sku: dbProduct.sku },
        defaultAction: 'keep',
      });
    }
  }

  const newCount = diff.filter((d) => d.type === 'NEW').length;
  const modifiedCount = diff.filter((d) => d.type === 'MODIFIED').length;
  const removedCount = diff.filter((d) => d.type === 'REMOVED').length;

  return {
    items: diff,
    summary: {
      newCount,
      modifiedCount,
      removedCount,
      unchangedCount,
      totalFetched: shopifyProducts.length,
    },
  };
}
