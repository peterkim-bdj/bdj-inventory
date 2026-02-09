import { z } from 'zod';

// === API Query Schema ===

export const vendorQuerySchema = z.object({
  search: z.string().optional(),
  hasContact: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  autoNotify: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'productCount', 'minLeadDays', 'contactStatus']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// === Create/Update Schema ===

export const vendorCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional().nullable(),
  contactName: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  website: z.string().url().max(500).optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  autoNotify: z.boolean().optional().default(false),
  minLeadDays: z.coerce.number().int().min(0).max(365).optional().default(3),
});

export const vendorUpdateSchema = vendorCreateSchema.partial().omit({ name: true }).extend({
  name: z.string().min(1).max(255).optional(),
});

// === Interfaces ===

export interface VendorListItem {
  id: string;
  name: string;
  code: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  autoNotify: boolean;
  minLeadDays: number;
  isActive: boolean;
  hasContact: boolean;
  _count: { products: number };
}

export interface VendorDetail extends VendorListItem {
  website: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    imageUrl: string | null;
    price: string | null;
    productType: string | null;
    _count: { inventoryItems: number };
  }>;
}

export interface VendorImportPreviewRow {
  name: string;
  code?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  notes?: string;
  minLeadDays?: number;
  rowNumber: number;
  status: 'new' | 'duplicate' | 'error';
  errors: Array<{ field: string; message: string }>;
}

export interface VendorImportResult {
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{ row: number; field: string; message: string }>;
}
