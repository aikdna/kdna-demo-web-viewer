const nextConfig = {
  // KDNA Core resolves its published schemas at runtime. Keep the Node.js
  // server adapter outside the browser/server bundler so those exact files are
  // loaded from the installed package instead of being rewritten by Turbopack.
  serverExternalPackages: [
    '@aikdna/kdna-core',
    '@aikdna/kdna-web-server',
  ],
}

export default nextConfig
