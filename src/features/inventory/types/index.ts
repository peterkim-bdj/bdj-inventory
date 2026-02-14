import { z } from 'zod';

// === Enums ===

export const INVENTORY_STATUS = ['AVAILABLE', 'RESERVED', 'SOLD', 'RETURNED', 'DAMAGED'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUS)[number];

export const ITEM_CONDITION = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'] as const;
export type ItemCondition = (typeof ITEM_CONDITION)[number];

// === API Schemas ===

export const scanQuerySchema = z.object({
  barcode: z.string().min(1),
});

export const registerSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().optional(),
  quantity: z.number().int().min(1).max(100),
  condition: z.enum(ITEM_CONDITION).default('NEW'),
  notes: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  shopifyBarcode: z.string().optional(),
  productType: z.string().optional(),
  price: z.number().optional(),
  vendorName: z.string().optional(),
});

export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(INVENTORY_STATUS).optional(),
  locationId: z.string().optional(),
  productId: z.string().optional(),
  shopifyStoreId: z.string().optional(),
  vendorId: z.string().optional(),
  trash: z.coerce.boolean().optional(),
  sortBy: z.enum(['barcode', 'receivedAt', 'status', 'productName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const inventoryActionSchema = z.object({
  action: z.enum(['softDelete', 'restore']),
});

export const inventoryDeleteSchema = z.object({
  confirm: z.literal(true),
});

export const locationQuerySchema = z.object({
  parentId: z.string().optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
});

export const locationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  parentId: z.string().optional(),
  level: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
});

// === Interfaces ===

export interface LocationItem {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  description: string | null;
  isActive: boolean;
  _count?: { inventoryItems: number };
}

export interface InventoryItemDetail {
  id: string;
  barcode: string;
  status: InventoryStatus;
  condition: ItemCondition;
  notes: string | null;
  receivedAt: string;
  soldAt: string | null;
  deletedAt: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    variantTitle: string | null;
    imageUrl: string | null;
    barcodePrefix: string;
    shopifyBarcode: string | null;
    shopifyStoreId: string | null;
    vendorName: string | null;
    shopifyStore: { id: string; name: string } | null;
    vendor: { id: string; name: string } | null;
  };
  location: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface ScanResult {
  type: 'exact' | 'sku' | 'name';
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    variantTitle: string | null;
    shopifyBarcode: string | null;
    barcodePrefix: string;
    imageUrl: string | null;
    price: string | null;
    vendorName: string | null;
    _count: { inventoryItems: number };
  }>;
}

export interface InventoryFilterOption {
  id: string;
  name: string;
  count: number;
}

export interface InventoryFiltersMeta {
  stores: InventoryFilterOption[];
  vendors: InventoryFilterOption[];
}

export interface ProductInventoryGroup {
  product: {
    id: string;
    name: string;
    variantTitle: string | null;
    sku: string | null;
    imageUrl: string | null;
    shopifyStoreId: string | null;
    vendorName: string | null;
  };
  totalCount: number;
  statusCounts: Partial<Record<InventoryStatus, number>>;
}

export interface GroupedInventoryResponse {
  groups: ProductInventoryGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    totalItems: number;
  };
  stats: {
    byStatus: Array<{ status: string; count: number }>;
    total: number;
  };
  filters: InventoryFiltersMeta;
}

export const groupedInventoryQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(INVENTORY_STATUS).optional(),
  locationId: z.string().optional(),
  shopifyStoreId: z.string().optional(),
  vendorId: z.string().optional(),
  sortBy: z.enum(['totalCount', 'productName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export interface RegisterResult {
  items: Array<{
    id: string;
    barcode: string;
  }>;
  product: {
    id: string;
    name: string;
    barcodePrefix: string;
  };
}

// === Label Printing ===

export interface LabelSize {
  name: string;
  key: string;
  width: number;
  height: number;
}

export const LABEL_PRESETS: LabelSize[] = [
  { name: '2" × 1"', key: '2x1', width: 2, height: 1 },
  { name: '2.25" × 1.25"', key: '2.25x1.25', width: 2.25, height: 1.25 },
  { name: '4" × 6"', key: '4x6', width: 4, height: 6 },
];

export const LABEL_SIZE_STORAGE_KEY = 'bdj-label-size';

export interface PrintLabelData {
  items: Array<{ barcode: string }>;
  productName: string;
}

export function getLabelBarcodeParams(label: LabelSize) {
  const area = label.width * label.height;

  if (area <= 2.5) {
    return { barcodeWidth: 1.0, barcodeHeight: 30, fontSize: 8, showProductName: false, productNameMaxChars: 0, margin: 2 };
  } else if (area <= 4) {
    return { barcodeWidth: 1.2, barcodeHeight: 40, fontSize: 9, showProductName: true, productNameMaxChars: 25, margin: 3 };
  } else {
    return { barcodeWidth: 2.0, barcodeHeight: 80, fontSize: 14, showProductName: true, productNameMaxChars: 50, margin: 4 };
  }
}
