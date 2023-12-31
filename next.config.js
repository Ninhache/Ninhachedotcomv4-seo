/** @type {import('next').NextConfig} */
// const nextConfig = {}
const config = {
  webpack: (config) => {
      config.module.rules.push({
          test: /\.svg$/,
          use: ['@svgr/webpack'],
      });

      return config;
  },
};

module.exports = config;