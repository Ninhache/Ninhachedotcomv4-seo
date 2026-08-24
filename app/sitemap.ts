import type { MetadataRoute } from 'next';
import { type Locale, locales } from '@/config';
import { getArticles } from '@/lib/blog';
import { getProfile } from '@/lib/portfolio';
import { absoluteUrl, localePath, xDefaultLocale } from '@/lib/seo/site';

/**
 * The site had no sitemap at all (`/sitemap.xml` was a 404), so nothing
 * declared the `fr`/`en` pairing or the real modification dates.
 *
 * One entry per locale per page, each carrying the full `alternates.languages`
 * map — Next turns that into the `<xhtml:link rel="alternate" hreflang>` nodes
 * Google uses to cluster translations instead of treating them as duplicates.
 *
 * `/resume` is deliberately absent: it is a redirect to a PDF, and a redirect
 * has no business in a sitemap.
 *
 * The category views (`/blog/c/<slug>`) are absent too, and that is a choice
 * rather than an oversight: they are indexable, self-canonical and linked from
 * every blog page, so crawlers find them by following the chips. Listing them
 * would put near-duplicates of `/blog` (one category holds most of the
 * articles) next to the articles themselves, which is exactly the signal a
 * sitemap should not send. The articles stay the priority.
 */

/** Rebuilt daily, and on demand whenever the backend busts the `articles` tag. */
export const revalidate = 86400;

/**
 * hreflang map for one path, plus `x-default`.
 *
 * `available` narrows the map to the locales the page actually exists in — an
 * article translated only into French must not advertise an English twin.
 */
function alternates(
    path = '',
    available: readonly Locale[] = locales
): MetadataRoute.Sitemap[number]['alternates'] {
    const languages: Record<string, string> = {};
    for (const locale of available) {
        languages[locale] = absoluteUrl(localePath(locale, path));
    }
    const fallback = available.includes(xDefaultLocale)
        ? xDefaultLocale
        : available[0];
    if (fallback) {
        languages['x-default'] = absoluteUrl(localePath(fallback, path));
    }
    return { languages };
}

/** Most recent `updatedAt` in a set of articles, or now when there are none. */
function latestUpdate(articles: { updatedAt?: string | null }[]): Date {
    const stamps = articles
        .map(a => (a.updatedAt ? Date.parse(a.updatedAt) : Number.NaN))
        .filter(n => !Number.isNaN(n));
    return stamps.length > 0 ? new Date(Math.max(...stamps)) : new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // `getArticles` swallows backend failures and returns `[]`, so an outage
    // shrinks the sitemap to the static routes instead of failing the build.
    const [rawArticles, profile] = await Promise.all([
        getArticles(),
        getProfile().catch(() => null),
    ]);
    const articles = rawArticles.filter(a => a.isVisible);

    // The home's own content is the profile, so its `updatedAt` is the only
    // honest signal here. Stamping the regeneration time instead would tell
    // crawlers the page changed every single day.
    const homeUpdated = profile?.updatedAt
        ? new Date(profile.updatedAt)
        : latestUpdate(articles);

    const staticEntries: MetadataRoute.Sitemap = locales.flatMap(locale => [
        {
            url: absoluteUrl(localePath(locale)),
            lastModified: homeUpdated,
            changeFrequency: 'monthly' as const,
            priority: 1,
            alternates: alternates(),
        },
        {
            url: absoluteUrl(localePath(locale, '/blog')),
            lastModified: latestUpdate(articles),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
            alternates: alternates('/blog'),
        },
    ]);

    const articleEntries: MetadataRoute.Sitemap = articles.flatMap(article => {
        // An article only exists in the locales it was translated into;
        // advertising a missing translation would send crawlers to a 404.
        const available = locales.filter(locale =>
            article.translations.some(t => t.locale === locale)
        );
        const path = `/blog/${article.slug}`;
        return available.map(locale => ({
            url: absoluteUrl(localePath(locale, path)),
            lastModified: new Date(
                article.updatedAt ?? article.publishedAt ?? article.createdAt
            ),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
            alternates: alternates(path, available),
        }));
    });

    return [...staticEntries, ...articleEntries];
}
