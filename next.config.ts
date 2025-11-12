import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to silence the warning - Turbopack works fine with default settings
  },
};

export default nextConfig;