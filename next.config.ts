/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Experimental features for App Router
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'cloudinary'],
    serverActions: true,
  },

  // ✅ Allow external packages in server runtime
  serverExternalPackages: ['mongoose', 'cloudinary'],

  // ✅ Image configurations
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Remove the generic '**' pattern as it's too broad
    ],
  },

  // ✅ TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ✅ Environment variables
  env: {
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  },

  // ✅ Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;