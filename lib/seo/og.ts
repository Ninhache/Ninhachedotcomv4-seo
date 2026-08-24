import type { Locale } from '@/config';

/**
 * Contract for the social-card endpoint (`app/api/og/route.tsx`), shared by the
 * metadata builder that points at it and by the route that parses it.
 *
 * `kind` is a closed set and the card's text is resolved server-side from the
 * slug: the endpoint must never render free-form text taken from the query,
 * or it becomes a generator of arbitrary images on the site's own domain.
 */
export const OG_KINDS = ['home', 'blog', 'article'] as const;

export type OgKind = (typeof OG_KINDS)[number];

export const isOgKind = (value: string | null): value is OgKind =>
    value !== null && (OG_KINDS as readonly string[]).includes(value);

/** Open Graph's canonical card size; both `og:image` and `twitter:image` use it. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Root-relative URL of the generated card for a given page. */
export function ogImagePath(
    kind: OgKind,
    locale: Locale,
    slug?: string
): string {
    const params = new URLSearchParams({ kind, locale });
    if (slug) params.set('slug', slug);
    return `/api/og?${params.toString()}`;
}
