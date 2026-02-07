import { z } from 'zod';

export const productQuerySchema = z.object({
  search: z.string().optional(),
  storeIds: z.string().optional(),
  vendorIds: z.string().optional(),
  productTypes: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'updatedAt', 'vendorName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type ProductQueryParams = z.infer<typeof productQuerySchema>;

export interface ProductItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  shopifyBarcode: string | null;
  barcodePrefix: string;
  productType: string | null;
  price: string | null;
  compareAtPrice: string | null;
  vendorName: string | null;
  shopifyStore: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOption {
  id?: string;
  value?: string;
  name?: string;
  count: number;
}

export interface ProductsResponse {
  products: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    stores: FilterOption[];
    vendors: FilterOption[];
    productTypes: FilterOption[];
  };
}
