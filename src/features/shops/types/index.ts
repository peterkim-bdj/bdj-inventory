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

export const updateShopSchema = createShopSchema.partial();

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
