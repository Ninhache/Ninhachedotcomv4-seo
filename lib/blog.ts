import type { Locale } from '@/config';
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

/** A single visible article by slug, or null (draft/unknown slug → 404 → null). */
export const getArticleBySlug = (slug: string) =>
    fetchPublic<ArticleDTO | null>(
        `/articles/${encodeURIComponent(slug)}`,
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
