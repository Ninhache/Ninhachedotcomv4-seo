/** @type {import('next').NextConfig} */

const config = {
    // Pin the workspace root: a stray lockfile in a parent dir made Turbopack
    // infer the wrong root. Without this, Next warns and may resolve from there.
    turbopack: { root: __dirname },
    webpack: config => {
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });

        return config;
    },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

module.exports = withBundleAnalyzer(withNextIntl(config));
