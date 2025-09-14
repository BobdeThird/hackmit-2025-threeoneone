import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'spot-sf-res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'spot-boston-res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'spot-nyc-res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // Supabase storage domain
      // Supabase storage domain derived from env
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [{
        protocol: 'https' as const,
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
      }] : []),
    ],
  },
};

export default nextConfig;
