import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BDJ Inventory',
    short_name: 'BDJ Inv',
    description: 'Shopify multi-store inventory management system',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
  };
}
