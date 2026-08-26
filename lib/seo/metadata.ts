import type { Metadata } from 'next';
import { type Locale, locales } from '@/config';
import { OG_SIZE } from './og';
import {
    absoluteUrl,
    localePath,
    OG_LOCALE,
    SITE,
    xDefaultLocale,
} from './site';

/**
 * The one place page metadata is built.
 *
 * Next merges metadata *shallowly, per top-level key*: a page that declares
 * only `openGraph` silently inherits the parent layout's entire `twitter`
 * block. That is what shipped stale titles on every article — `og:title` was
 * right while `twitter:title` still said "Almeida Neo's Portfolio", and Slack,
 * Discord and X read the `twitter:` tags first.
 *
 * Routing every page through this builder means both blocks are always written
 * together from the same inputs, so that class of bug cannot come back by
 * omission.
 */

type LanguageMap = NonNullable<
    NonNullable<Metadata['alternates']>['languages']
>;

export type PageMetadataInput = {
    locale: Locale;
    /** Route path **without** the locale segment; `''` for the home. */
    path?: string;
    /**
     * Per-locale paths, when the URL differs between locales (article slugs are
     * translated). Only the `hreflang` map reads it; `path` still drives this
     * page's own canonical, which must stay the current locale's URL.
     */
    paths?: LocalePaths;
    title: string;
    description: string;
    /** Skip the `· Néo Almeida` suffix (the home already carries the full name). */
    absoluteTitle?: boolean;
    /** Social card; defaults to the static fallback when the caller has none. */
    image?: string;
    imageAlt?: string;
    type?: 'website' | 'article' | 'profile';
    /** `article` only — ISO 8601. */
    publishedTime?: string;
    modifiedTime?: string;
    tags?: string[];
    section?: string;
    /** Extra `alternates.types` (e.g. an article's `text/markdown` twin). */
    types?: Record<string, string>;
    robots?: Metadata['robots'];
};

/** Per-locale path overrides, for routes whose URL is not the same in every
 * locale (blog articles: their slug is translated). */
export type LocalePaths = Partial<Record<Locale, string>>;

/**
 * `hreflang` map for a path: every locale plus `x-default`.
 *
 * Derived from `locales` so adding one needs no change here. The cast is the
 * price of that: Next types the keys as a closed union of BCP-47 codes, which a
 * loop cannot produce as literals.
 *
 * Most routes share one path across locales, so `path` alone is enough. Article
 * slugs are translated, so those pass `paths` and each locale gets its own URL.
 * Getting this wrong is worse than emitting nothing: an hreflang pointing at a
 * URL that redirects, or at the wrong page, tells a search engine the two pages
 * are the same when they are not.
 */
export function languageAlternates(
    path = '',
    paths?: LocalePaths
): LanguageMap {
    const map: Record<string, string> = {};
    for (const locale of locales) {
        map[locale] = absoluteUrl(localePath(locale, paths?.[locale] ?? path));
    }
    map['x-default'] = absoluteUrl(
        localePath(xDefaultLocale, paths?.[xDefaultLocale] ?? path)
    );
    return map as LanguageMap;
}

export function pageMetadata(input: PageMetadataInput): Metadata {
    const {
        locale,
        path = '',
        paths,
        title,
        description,
        absoluteTitle = false,
        image = SITE.fallbackSocialImage,
        imageAlt,
        type = 'website',
        publishedTime,
        modifiedTime,
        tags,
        section,
        types,
        robots,
    } = input;

    const canonical = absoluteUrl(localePath(locale, path));
    // Social scrapers are the least forgiving consumers of relative URLs, so
    // these are emitted absolute rather than relying on `metadataBase`.
    // Social titles stay bare: `og:site_name` already carries "Néo Almeida",
    // so suffixing again reads as "Title · Néo Almeida" under a "Néo Almeida"
    // label in Slack and Discord. The document <title> still gets the suffix,
    // from the layout's title template.
    const images = [
        {
            url: absoluteUrl(image),
            width: OG_SIZE.width,
            height: OG_SIZE.height,
            alt: imageAlt ?? title,
        },
    ];

    const openGraph: NonNullable<Metadata['openGraph']> = {
        title,
        description,
        url: canonical,
        siteName: SITE.siteName,
        locale: OG_LOCALE[locale],
        alternateLocale: locales
            .filter(l => l !== locale)
            .map(l => OG_LOCALE[l]),
        images,
        ...(type === 'article'
            ? {
                  type: 'article' as const,
                  publishedTime,
                  modifiedTime,
                  authors: [SITE.name],
                  tags,
                  section,
              }
            : { type }),
    };

    return {
        title: absoluteTitle ? { absolute: title } : title,
        description,
        alternates: {
            canonical,
            languages: languageAlternates(path, paths),
            ...(types ? { types } : {}),
        },
        openGraph,
        twitter: {
            card: 'summary_large_image',
            site: SITE.twitterHandle,
            creator: SITE.twitterHandle,
            title,
            description,
            images: images.map(i => i.url),
        },
        ...(robots ? { robots } : {}),
    };
}
