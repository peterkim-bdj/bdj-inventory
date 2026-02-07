import { describe, it, expect } from 'vitest';
import { transformToProductData, transformAllProducts } from './transform';
import type { ShopifyProduct } from './types';

const mockShopifyProduct: ShopifyProduct = {
  id: 'gid://shopify/Product/12345',
  title: 'Test Product',
  descriptionHtml: '<p>Description</p>',
  vendor: 'Test Vendor',
  productType: 'Shoes',
  status: 'ACTIVE',
  featuredImage: { url: 'https://cdn.shopify.com/image.jpg' },
  variants: {
    edges: [
      {
        node: {
          id: 'gid://shopify/ProductVariant/67890',
          sku: 'SKU-001',
          barcode: '1234567890',
          price: '29.99',
          compareAtPrice: '39.99',
        },
      },
      {
        node: {
          id: 'gid://shopify/ProductVariant/67891',
          sku: 'SKU-002',
          barcode: null,
          price: '34.99',
          compareAtPrice: null,
        },
      },
    ],
  },
};

describe('transformToProductData', () => {
  it('transforms a Shopify product into TransformedProduct array', () => {
    const result = transformToProductData(mockShopifyProduct, 'store-1');

    expect(result).toHaveLength(2);
  });

  it('extracts numeric IDs from GID format', () => {
    const result = transformToProductData(mockShopifyProduct, 'store-1');

    expect(result[0].shopifyProductId).toBe('12345');
    expect(result[0].shopifyVariantId).toBe('67890');
    expect(result[1].shopifyVariantId).toBe('67891');
  });

  it('maps all fields correctly for first variant', () => {
    const result = transformToProductData(mockShopifyProduct, 'store-1');
    const first = result[0];

    expect(first.name).toBe('Test Product');
    expect(first.description).toBe('<p>Description</p>');
    expect(first.imageUrl).toBe('https://cdn.shopify.com/image.jpg');
    expect(first.sku).toBe('SKU-001');
    expect(first.shopifyBarcode).toBe('1234567890');
    expect(first.productType).toBe('Shoes');
    expect(first.price).toBe('29.99');
    expect(first.compareAtPrice).toBe('39.99');
    expect(first.vendorName).toBe('Test Vendor');
    expect(first.shopifyStoreId).toBe('store-1');
  });

  it('handles null values correctly', () => {
    const result = transformToProductData(mockShopifyProduct, 'store-1');
    const second = result[1];

    expect(second.shopifyBarcode).toBeNull();
    expect(second.compareAtPrice).toBeNull();
  });

  it('handles product without featured image', () => {
    const noImage = { ...mockShopifyProduct, featuredImage: null };
    const result = transformToProductData(noImage, 'store-1');

    expect(result[0].imageUrl).toBeNull();
  });

  it('handles empty descriptionHtml', () => {
    const noDesc = { ...mockShopifyProduct, descriptionHtml: null };
    const result = transformToProductData(noDesc, 'store-1');

    expect(result[0].description).toBeNull();
  });
});

describe('transformAllProducts', () => {
  it('flattens multiple products with variants', () => {
    const product2: ShopifyProduct = {
      ...mockShopifyProduct,
      id: 'gid://shopify/Product/99999',
      title: 'Product 2',
      variants: {
        edges: [
          {
            node: {
              id: 'gid://shopify/ProductVariant/11111',
              sku: 'SKU-X',
              barcode: null,
              price: '10.00',
              compareAtPrice: null,
            },
          },
        ],
      },
    };

    const result = transformAllProducts(
      [mockShopifyProduct, product2],
      'store-1',
    );

    // 2 variants from first + 1 from second = 3
    expect(result).toHaveLength(3);
    expect(result[2].name).toBe('Product 2');
    expect(result[2].shopifyProductId).toBe('99999');
  });

  it('returns empty array for empty input', () => {
    const result = transformAllProducts([], 'store-1');
    expect(result).toHaveLength(0);
  });
});
