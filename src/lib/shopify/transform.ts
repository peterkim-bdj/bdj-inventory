import type { ShopifyProduct, TransformedProduct } from './types';

function extractNumericId(gid: string): string {
  return gid.split('/').pop()!;
}

export function transformToProductData(
  shopifyProduct: ShopifyProduct,
  storeId: string,
): TransformedProduct[] {
  return shopifyProduct.variants.edges.map(({ node: variant }) => ({
    name: shopifyProduct.title,
    description: shopifyProduct.descriptionHtml || null,
    imageUrl: shopifyProduct.featuredImage?.url || null,
    sku: variant.sku || null,
    shopifyBarcode: variant.barcode || null,
    productType: shopifyProduct.productType || null,
    price: variant.price || null,
    compareAtPrice: variant.compareAtPrice || null,
    vendorName: shopifyProduct.vendor || null,
    shopifyProductId: extractNumericId(shopifyProduct.id),
    shopifyVariantId: extractNumericId(variant.id),
    shopifyStoreId: storeId,
  }));
}

export function transformAllProducts(
  shopifyProducts: ShopifyProduct[],
  storeId: string,
): TransformedProduct[] {
  return shopifyProducts.flatMap((p) => transformToProductData(p, storeId));
}
