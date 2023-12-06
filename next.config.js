/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    // This hook is used by Next.js to perform a one-time initialization at boot
    // before the service is started. See instrumentation.ts.
    instrumentationHook: true
  },
}

module.exports = nextConfig
