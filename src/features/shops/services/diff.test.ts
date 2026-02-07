import { describe, it, expect } from 'vitest';
import { generateDiff } from './diff';
import type { TransformedProduct } from '@/lib/shopify/types';

function makeShopifyProduct(
  overrides: Partial<TransformedProduct> = {},
): TransformedProduct {
  return {
    name: 'Product A',
    description: null,
    imageUrl: null,
    sku: 'SKU-001',
    shopifyBarcode: null,
    productType: 'Shoes',
    price: '29.99',
    compareAtPrice: null,
    vendorName: 'Vendor A',
    shopifyProductId: '100',
    shopifyVariantId: '200',
    shopifyStoreId: 'store-1',
    ...overrides,
  };
}

function makeDbProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'db-1',
    name: 'Product A',
    description: null,
    sku: 'SKU-001',
    shopifyBarcode: null,
    productType: 'Shoes',
    price: '29.99',
    compareAtPrice: null,
    imageUrl: null,
    vendorName: 'Vendor A',
    shopifyProductId: '100',
    shopifyVariantId: '200',
    ...overrides,
  };
}

describe('generateDiff', () => {
  it('detects NEW products', () => {
    const shopify = [makeShopifyProduct()];
    const db: ReturnType<typeof makeDbProduct>[] = [];

    const { items, summary } = generateDiff(shopify, db);

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('NEW');
    expect(items[0].defaultAction).toBe('add');
    expect(summary.newCount).toBe(1);
    expect(summary.modifiedCount).toBe(0);
    expect(summary.removedCount).toBe(0);
  });

  it('detects REMOVED products', () => {
    const shopify: TransformedProduct[] = [];
    const db = [makeDbProduct()];

    const { items, summary } = generateDiff(shopify, db);

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('REMOVED');
    expect(items[0].defaultAction).toBe('keep');
    expect(summary.removedCount).toBe(1);
  });

  it('detects MODIFIED products with field changes', () => {
    const shopify = [makeShopifyProduct({ name: 'Product A Updated', price: '39.99' })];
    const db = [makeDbProduct()];

    const { items, summary } = generateDiff(shopify, db);

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('MODIFIED');
    expect(items[0].defaultAction).toBe('update');
    expect(items[0].changes).toHaveLength(2);

    const nameChange = items[0].changes!.find((c) => c.field === 'name');
    expect(nameChange).toBeDefined();
    expect(nameChange!.old).toBe('Product A');
    expect(nameChange!.new).toBe('Product A Updated');

    const priceChange = items[0].changes!.find((c) => c.field === 'price');
    expect(priceChange).toBeDefined();
    expect(priceChange!.old).toBe('29.99');
    expect(priceChange!.new).toBe('39.99');

    expect(summary.modifiedCount).toBe(1);
  });

  it('reports unchanged products in summary', () => {
    const shopify = [makeShopifyProduct()];
    const db = [makeDbProduct()];

    const { items, summary } = generateDiff(shopify, db);

    expect(items).toHaveLength(0);
    expect(summary.unchangedCount).toBe(1);
    expect(summary.totalFetched).toBe(1);
  });

  it('handles mixed scenario (new + modified + removed + unchanged)', () => {
    const shopify = [
      makeShopifyProduct({ shopifyProductId: '100', shopifyVariantId: '200' }),
      makeShopifyProduct({
        shopifyProductId: '101',
        shopifyVariantId: '201',
        name: 'Modified Product',
      }),
      makeShopifyProduct({
        shopifyProductId: '103',
        shopifyVariantId: '203',
        name: 'Brand New Product',
      }),
    ];

    const db = [
      makeDbProduct({
        id: 'db-1',
        shopifyProductId: '100',
        shopifyVariantId: '200',
      }),
      makeDbProduct({
        id: 'db-2',
        shopifyProductId: '101',
        shopifyVariantId: '201',
        name: 'Old Name',
      }),
      makeDbProduct({
        id: 'db-3',
        shopifyProductId: '102',
        shopifyVariantId: '202',
        name: 'Removed Product',
      }),
    ];

    const { items, summary } = generateDiff(shopify, db);

    expect(summary.newCount).toBe(1);
    expect(summary.modifiedCount).toBe(1);
    expect(summary.removedCount).toBe(1);
    expect(summary.unchangedCount).toBe(1);
    expect(summary.totalFetched).toBe(3);
    expect(items).toHaveLength(3); // new + modified + removed (unchanged not in items)
  });

  it('generates correct diff IDs', () => {
    const shopify = [makeShopifyProduct()];
    const db: ReturnType<typeof makeDbProduct>[] = [];

    const { items } = generateDiff(shopify, db);

    expect(items[0].id).toBe('new_100:200');
  });

  it('handles empty inputs', () => {
    const { items, summary } = generateDiff([], []);

    expect(items).toHaveLength(0);
    expect(summary.newCount).toBe(0);
    expect(summary.modifiedCount).toBe(0);
    expect(summary.removedCount).toBe(0);
    expect(summary.unchangedCount).toBe(0);
    expect(summary.totalFetched).toBe(0);
  });
});
