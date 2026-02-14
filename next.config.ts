import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=()' },
      ],
    },
  ],
  images: {
    remotePatterns: [
      { hostname: 'cdn.shopify.com' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
