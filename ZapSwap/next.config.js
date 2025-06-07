/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['test-node.zetrix.com'],
  },
  env: {
    NEXT_PUBLIC_NODE_URL: 'test-node.zetrix.com',
    NEXT_PUBLIC_CHAIN_ID: '1',
  },
  webpack: (config, { webpack }) => {
    // Resolve Node.js modules required by zetrix-sdk-nodejs
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
      dns: false,
      tty: false,
      child_process: false,
      os: false,
      http: false,
      https: false,
      zlib: false,
      stream: false,
      crypto: false,
      path: false,
      url: false,
      assert: false,
      util: false,
      timers: false,
      buffer: require.resolve('buffer/'),
    };
    
    // Add buffer polyfill
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );
    
    return config;
  },
};

module.exports = nextConfig; 