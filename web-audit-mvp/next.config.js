/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

module.exports = nextConfig;
