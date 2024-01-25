/** @type {import('next').NextConfig} */

const config = {
  webpack: (config) => {
      config.module.rules.push({
          test: /\.svg$/,
          use: ['@svgr/webpack'],
      });

      return config;
  },
};

const withNextIntl = require("next-intl/plugin")("./i18n.ts") ;

module.exports = withNextIntl(config)