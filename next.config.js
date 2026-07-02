/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const config = {
    // Pin the workspace root to THIS project. A stray lockfile in a parent dir
    // (/home/neo/package-lock.json) made Turbopack infer /home/neo as the root
    // and scan the whole home directory → very slow compiles / hangs in dev.
    turbopack: {
        root: __dirname,
    },
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
