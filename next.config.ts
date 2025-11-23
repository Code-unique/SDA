/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Allow using external packages in the server runtime
  serverExternalPackages: ['mongoose', 'cloudinary'],

  // ✅ Increase upload limit for API routes (default is 10MB)
  /*middlewareClientMaxBodySize: {
    value: 100 * 1024 * 1024, // 100 MB
  },*/

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  env: {
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  },
};

export default nextConfig;
