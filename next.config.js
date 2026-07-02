/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const config = {
    allowedDevOrigins: ['localhost', '172.20.10.2'],
    // Pin the workspace root: a stray lockfile in a parent dir made Turbopack
    // infer the wrong root. Without this, Next warns and may resolve from there.
    images: {
        dangerouslyAllowLocalIP: isDev,
        remotePatterns: [
            {
                protocol: isDev ? 'http' : 'https',
                // Uploaded media is served by the backend API host, not the
                // front-end origin. Must match NEXT_PUBLIC_BACKOFFICE_URL's host.
                hostname: isDev ? 'localhost' : 'api.ninhache.fr',
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
