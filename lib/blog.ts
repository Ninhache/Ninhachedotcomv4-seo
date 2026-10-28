import { type Locale, locales } from '@/config';
import { baseUrl } from './baseurl';
import { fetchPublic, localeTags } from './portfolio';
import type {
    ArticleCategoryDTO,
    ArticleDTO,
    ArticleTranslationDTO,
} from './types';

/**
 * Public, unauthenticated blog read path (server-side, ISR-cached).
 *
 * Mirrors `lib/portfolio.ts`: each fetch is tagged so the backend busts it via
 * /api/revalidate on any article/category mutation (no restart needed). The
 * backend already filters to `isVisible` articles on these public routes.
 */

/** All visible articles, newest first. Optionally scoped to a category slug. */
export const getArticles = (category?: string) =>
    fetchPublic<ArticleDTO[]>(
        `/articles${category ? `?category=${encodeURIComponent(category)}` : ''}`,
        localeTags('articles'),
        []
    );

/**
 * A single visible article by slug, or null (draft/unknown slug → 404 → null).
 *
 * `locale` disambiguates: slugs are unique *within* a locale, so the same word
 * can legitimately be a French article's slug and another English article's.
 * The backend tries the requested locale first, then any locale (which is how
 * a French slug under /en still resolves, so the page can redirect), then the
 * internal key.
 */
export const getArticleBySlug = (slug: string, locale?: Locale) =>
    fetchPublic<ArticleDTO | null>(
        `/articles/${encodeURIComponent(slug)}${locale ? `?locale=${locale}` : ''}`,
        localeTags('articles'),
        null
    );

/**
 * Private review read: resolves an article by its preview token, draft or not.
 *
 * Deliberately bypasses `fetchPublic`. A review link exists to show the *current*
 * state of a draft, so it must never be served from the 24h ISR data cache, and
 * it must never be tagged (a draft has no business in the public cache graph).
 * Same failure posture as the public path: a backend blip returns null, which
 * the route turns into a 404 rather than a 500.
 */
export async function getArticleByPreviewToken(
    token: string
): Promise<ArticleDTO | null> {
    try {
        const res = await fetch(
            `${baseUrl}/articles/preview/${encodeURIComponent(token)}`,
            { cache: 'no-store' }
        );
        if (!res.ok) return null;
        return (await res.json()) as ArticleDTO;
    } catch (err) {
        console.warn('Article preview fetch failed', err);
        return null;
    }
}

/** Visible blog categories, used for the /blog filter chips. */
export const getArticleCategories = () =>
    fetchPublic<ArticleCategoryDTO[]>(
        '/article-categories',
        localeTags('article-categories'),
        []
    );

/** Pick an article's translation for `locale`, falling back to the first row. */
export function articleTranslation(
    article: ArticleDTO,
    locale: Locale
): ArticleTranslationDTO | undefined {
    return (
        article.translations.find(t => t.locale === locale) ??
        article.translations[0]
    );
}

/**
 * An article's public URL segment in `locale`.
 *
 * The slug lives on the translation, so it differs per locale: the same article
 * is /fr/blog/reseed-sans-downtime and
 * /en/blog/zero-downtime-data-reseeding-with-a-custom-command. Every article URL
 * the site builds goes through here rather than reading `article.slug`, which is
 * now only an internal key.
 *
 * The fallbacks matter for the admin preview path, where a draft may not have
 * every translation yet: the requested locale's slug, else any translation's,
 * else the internal key.
 */
export function articleSlug(article: ArticleDTO, locale: Locale): string {
    return (
        article.translations.find(t => t.locale === locale)?.slug ??
        article.translations[0]?.slug ??
        article.slug
    );
}

/** Locale-aware display name of a blog category (falls back to its slug). */
export function categoryName(
    category: ArticleCategoryDTO,
    locale: Locale
): string {
    return (
        category.translations.find(t => t.locale === locale)?.name ??
        category.translations[0]?.name ??
        category.slug
    );
}

/** "2 juillet 2026" / "July 2, 2026" — long, locale-aware publication date. */
export function formatArticleDate(iso: string | null, locale: Locale): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(iso));
}

/** One article's slug in every locale, in the shape the locale switcher needs. */
export type ArticleSlugs = Record<Locale, string>;

/**
 * The slug of every article in every locale.
 *
 * The locale switcher lives in the header, a sibling of the page content, so it
 * cannot be handed the current article's alternate slug by the article page. It
 * gets the whole (small, ISR-cached) table instead and looks its own path up.
 */
export function articleSlugMap(articles: ArticleDTO[]): ArticleSlugs[] {
    return articles.map(
        article =>
            Object.fromEntries(
                locales.map(locale => [locale, articleSlug(article, locale)])
            ) as ArticleSlugs
    );
}
