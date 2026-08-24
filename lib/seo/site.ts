import type { Locale } from '@/config';
import { defaultLocale } from '@/config';

/**
 * Single source of truth for the site's own identity and origin.
 *
 * `lib/baseurl.ts` resolves the *backend API* origin; nothing resolved the
 * *site* origin, which is why `https://ninhache.fr/` used to be typed by hand
 * inside the root layout's metadata (and stayed pinned to the root on every
 * page). Everything URL-shaped in the metadata, sitemap, robots, llms.txt and
 * JSON-LD now derives from here.
 */

/** No trailing slash, so `${siteUrl}${path}` is always well-formed. */
export const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'https://ninhache.fr'
).replace(/\/+$/, '');

/** Appended to every page title except the ones marked absolute. */
export const TITLE_SUFFIX = ' · Néo Almeida';

/** `%s`-style template for `metadata.title.template`, kept in sync with `withSuffix`. */
export const TITLE_TEMPLATE = `%s${TITLE_SUFFIX}`;

/** Decorates a page title exactly like `TITLE_TEMPLATE` does for the `<title>` tag. */
export const withSuffix = (title: string) => `${title}${TITLE_SUFFIX}`;

/**
 * Identity of last resort.
 *
 * `fetchPublic` never throws: on a backend outage it returns its fallback, so
 * the metadata layer must have real copy to fall back on. Shipping a
 * placeholder here is exactly the bug this whole module exists to remove.
 */
export const SITE = {
    name: 'Néo Almeida',
    siteName: 'Néo Almeida',
    twitterHandle: '@NinhacheUwU',
    /** Portrait used as the Person image when the backend has none. */
    image: '/images/Photo.webp',
    /** Static social card, used when the generated one cannot be reached. */
    fallbackSocialImage: '/images/Social.png',
} as const;

type LocaleCopy = { jobTitle: string; description: string };

/** Per-locale fallback copy, only used when the backend profile is unavailable. */
export const FALLBACK_COPY: Record<Locale, LocaleCopy> = {
    fr: {
        jobTitle: 'Développeur full-stack',
        description:
            'Portfolio de Néo Almeida, développeur full-stack : projets, parcours, compétences et articles techniques sur le web, le back-end et les outils que je construis.',
    },
    en: {
        jobTitle: 'Full-stack developer',
        description:
            'Portfolio of Néo Almeida, full-stack developer: projects, career, skills and technical articles about the web, back-end work and the tools I build.',
    },
};

/** Open Graph locale codes; `og:locale` used to be hardcoded to `en_US` on the French site. */
export const OG_LOCALE: Record<Locale, string> = {
    fr: 'fr_FR',
    en: 'en_US',
};

/** BCP-47 codes for `inLanguage` / `<html lang>`-style consumers. */
export const BCP47: Record<Locale, string> = {
    fr: 'fr-FR',
    en: 'en-US',
};

/**
 * Locale-prefixed path for a route.
 *
 * `localePrefix` is next-intl's default (`'always'`), so even the default
 * locale is served under `/fr` — the canonical URL must carry it.
 *
 * @param locale target locale
 * @param path route path without the locale segment (`''` for the home)
 */
export function localePath(locale: Locale, path = ''): string {
    const clean = path && !path.startsWith('/') ? `/${path}` : path;
    return `/${locale}${clean}`;
}

/** Absolute URL for a root-relative path (returns absolute inputs untouched). */
export function absoluteUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The locale a bare, unprefixed URL should resolve to (`x-default`). */
export const xDefaultLocale: Locale = defaultLocale;
