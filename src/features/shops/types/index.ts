import { z } from 'zod';

export const createShopSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  domain: z.string().regex(
    /^[a-z0-9-]+\.myshopify\.com$/,
    'Domain must be like store-name.myshopify.com'
  ),
  accessToken: z.string().min(1, 'Access token is required'),
  apiVersion: z.string().min(1).default('2025-01'),
});

export type CreateShopFormValues = z.input<typeof createShopSchema>;

export const updateShopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().regex(/^[a-z0-9-]+\.myshopify\.com$/).optional(),
  accessToken: z.string().optional().transform((v) => (v === '' ? undefined : v)),
  apiVersion: z.string().min(1).optional(),
});

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = {
  name?: string;
  domain?: string;
  accessToken?: string;
  apiVersion?: string;
};

export interface Shop {
  id: string;
  name: string;
  domain: string;
  apiVersion: string;
  productCount: number;
  lastSyncedAt: string | null;
  syncStatus: string;
  isActive: boolean;
}
