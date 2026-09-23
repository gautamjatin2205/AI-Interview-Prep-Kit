/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure server-side modules don't get bundled into the client
  // (Next.js 14 uses `serverComponentsExternalPackages` not `serverExternalPackages`)
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
