import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external access for debugging and browserbase
  experimental: {
    allowedDevOrigins: ['84.247.131.60:3000', '84.247.131.60'],
  },
  // Allow cross-origin access
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
