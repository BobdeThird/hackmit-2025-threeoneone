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
    ],
  },
};

export default nextConfig;
