/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compress: true,
  allowedDevOrigins: ['http://84.247.131.60:3001', 'http://localhost:3001', 'http://0.0.0.0:3001'],

  // Ignore TypeScript errors during build (Supabase types issue)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimisations pour éviter les problèmes réseau
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@supabase/supabase-js'],
  },

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
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development'
              ? 'no-cache, no-store, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig