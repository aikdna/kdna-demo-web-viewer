const nextConfig = {
  // Browser/Next consumes only the accepted portable graph. Basic Host is a
  // separate loopback process and is never bundled into this application.
  poweredByHeader: false,
  devIndicators: false,
  experimental: { cpus: 2 },
}
export default nextConfig
