/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

// When deployed on Vercel without a NEXT_PUBLIC_API_URL, proxy /api to the local
// backend for local development. In production, NEXT_PUBLIC_API_URL must be set
// to the backend's deployed URL, and this rewrite is disabled.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  nextConfig.asyncRewrites = async () => [
    {
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_PROXY ?? 'http://localhost:4000'}/api/:path*`,
    },
  ];
}

export default nextConfig;
