/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Experimental features for App Router
  experimental: {
    serverActions: {},
  },

  // ✅ Allow external packages in server runtime
  serverExternalPackages: ['mongoose', 'cloudinary', 'aws-sdk'],

  // ✅ Image configurations
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // ✅ Add S3 domains for your uploaded images/videos
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: process.env.AWS_S3_BUCKET_NAME ? `${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com` : '' },
    ],
    // ✅ Allow larger image sizes if needed
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ✅ TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

 

  // ✅ Compression for better performance
  compress: true,

  // ✅ Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ]
  },
};

export default nextConfig;