export interface ShopifyVariant {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  compareAtPrice: string | null;
  selectedOptions: { name: string; value: string }[];
}

export interface ShopifyProduct {
  id: string;
  title: string;
  descriptionHtml: string | null;
  vendor: string;
  productType: string;
  status: string;
  featuredImage: { url: string } | null;
  variants: {
    edges: Array<{ node: ShopifyVariant }>;
  };
}

export interface TransformedProduct {
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  shopifyBarcode: string | null;
  productType: string | null;
  price: string | null;
  compareAtPrice: string | null;
  vendorName: string | null;
  variantTitle: string | null;
  variantOptions: { name: string; value: string }[] | null;
  shopifyProductId: string;
  shopifyVariantId: string;
  shopifyStoreId: string;
}
