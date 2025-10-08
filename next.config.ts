import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Specify workspace root to avoid conflicts with multiple lockfiles
  outputFileTracingRoot: __dirname,
  // Disable ESLint during builds temporarily
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during builds temporarily
  typescript: {
    ignoreBuildErrors: true,
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
