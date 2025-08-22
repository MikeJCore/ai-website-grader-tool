/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Ensure consistent URLs
  // Configure webpack to handle certain dependencies
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        dns: false,
        tls: false,
      };
    }
    return config;
  },
  // Handle API routes in static export
  exportPathMap: async function() {
    return {
      '/': { page: '/' },
      // Add other static pages here
    };
  },
  // Disable image optimization API route in production
  images: {
    loader: 'imgix',
    path: '',
  },
  // Ensure API routes are handled correctly
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? '/api/audit' // This will be handled by Netlify Functions
          : '/api/audit', // This will be handled by Next.js in development
      },
    ];
  },
};

export default nextConfig;
