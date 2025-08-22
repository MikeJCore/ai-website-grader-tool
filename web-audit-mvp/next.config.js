/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'], // Add your image domains here
  },
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
  // Disable image optimization API route in production
  images: {
    domains: ['localhost'], // Add your image domains here
  },
  // For API routes in App Router
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Enable server components external packages
  transpilePackages: ['chrome-aws-lambda', 'puppeteer-core'],
};

export default nextConfig;
