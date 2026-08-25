import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Every Vercel Blob store gets its own subdomain, so the host is not
        // known until the store is provisioned. Without this entry `next/image`
        // refuses to render product photos at all.
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
