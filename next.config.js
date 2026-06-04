/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const config = {
    // Pin the workspace root: a stray lockfile in a parent dir made Turbopack
    // infer the wrong root. Without this, Next warns and may resolve from there.
    turbopack: { root: __dirname },

    images: {
        dangerouslyAllowLocalIP: isDev,
        remotePatterns: [
            {
                protocol: isDev ? 'http' : 'https',
                hostname: isDev ? 'localhost' : 'ninhache.fr',
                port: isDev ? '5000' : '',
                pathname: '/uploads/**',
            },
        ],
    },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

module.exports = withBundleAnalyzer(withNextIntl(config));
