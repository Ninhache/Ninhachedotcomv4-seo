import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * Replaces the former static `app/robots.txt` (both resolve `/robots.txt`, so
 * they cannot coexist). Three things the static file was missing: a `Sitemap:`
 * line, any protection for `/admin`, and a standards-compliant `Allow`
 * (`Allow: *` is not valid — the value is a path prefix, so it must be `/`).
 */
export default function robots(): MetadataRoute.Robots {
    const disallow = [
        // Private review links for unpublished articles. The pages also send
        // `noindex, nofollow`, which is the actual guarantee; this only keeps
        // well-behaved crawlers from fetching them at all.
        '/*/blog/preview/',
        // Back-office. `/admin/login` is publicly reachable and was crawlable.
        '/admin',
        // Endpoints, not pages. `/api/og` is excluded from the crawl too: the
        // cards are already declared through `og:image`, and there is nothing
        // to index in an image endpoint's query space.
        '/api/',
    ];

    return {
        rules: [
            { userAgent: '*', allow: '/', disallow },
            // Named explicitly so the intent is readable rather than inferred
            // from the wildcard: the AI crawlers are welcome on the public
            // pages, under exactly the same exclusions.
            {
                userAgent: [
                    'GPTBot',
                    'OAI-SearchBot',
                    'ChatGPT-User',
                    'ClaudeBot',
                    'Claude-User',
                    'Claude-SearchBot',
                    'PerplexityBot',
                    'Google-Extended',
                    'Applebot-Extended',
                ],
                allow: '/',
                disallow,
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
