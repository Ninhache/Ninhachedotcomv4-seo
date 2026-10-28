import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import readingTime from 'reading-time';
import { ArticleFooter } from '@/app/_components/blog/ArticleFooter';
import { ArticleView } from '@/app/_components/blog/ArticleView';
import { JsonLd } from '@/app/_components/seo/JsonLd';
import { type Locale, locales } from '@/config';
import {
    articleSlug,
    articleTranslation,
    getArticleBySlug,
    getArticles,
} from '@/lib/blog';
import { getArticleComments } from '@/lib/comments';
import { blogPostingJsonLd, breadcrumbJsonLd, graph } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { ogImagePath } from '@/lib/seo/og';
import { absoluteUrl, localePath, SITE } from '@/lib/seo/site';

export const revalidate = 86400;

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

/**
 * Pre-render every visible article at build time.
 *
 * Next passes the parent segment's params in, which is what makes per-locale
 * slugs work: this runs once per locale and emits *that* locale's slug, so the
 * build produces 13 French URLs and 13 different English ones rather than the
 * same 13 slugs twice. New/unknown slugs still resolve at request time then get
 * cached by ISR. `getArticles()` never throws (its fetch falls back to `[]`), so
 * a backend blip just yields no static paths.
 */
export async function generateStaticParams({
    params,
}: {
    params: { locale: string };
}) {
    const articles = await getArticles();
    return articles
        .filter(a => a.isVisible)
        .map(a => ({ slug: articleSlug(a, params.locale as Locale) }));
}

/**
 * Resolves an incoming slug to the article and to this locale's canonical slug.
 *
 * The backend accepts any of an article's slugs, so `/en/blog/<french-slug>`
 * finds the right article; serving it there would leave one page reachable at
 * two URLs, which splits its ranking and reads to an assistant as two competing
 * sources. Callers redirect instead.
 */
async function resolve(locale: Locale, slug: string) {
    const article = await getArticleBySlug(slug, locale);
    if (!article) return null;
    return { article, canonical: articleSlug(article, locale) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale, slug } = await props.params;
    const loc = locale as Locale;
    const resolved = await resolve(loc, slug);

    // An unknown slug renders a 404 below. Returning `{}` here used to let the
    // layout's defaults describe the page instead, which is how a missing
    // article ended up advertised with the site's generic title.
    if (!resolved) {
        return { title: 'Article', robots: { index: false, follow: false } };
    }
    const { article, canonical } = resolved;

    const tr = articleTranslation(article, loc);
    if (!tr) {
        return { title: 'Article', robots: { index: false, follow: false } };
    }

    return pageMetadata({
        locale: loc,
        path: `/blog/${canonical}`,
        // Each locale's hreflang must point at that locale's own slug, not at
        // this one's under a different prefix (which would 301).
        paths: Object.fromEntries(
            locales.map(l => [l, `/blog/${articleSlug(article, l)}`])
        ),
        title: tr.title,
        description: tr.excerpt,
        type: 'article',
        // Keyed on the internal slug: one generated card per article, shared by
        // both locales, so the image cache is not split in two.
        image: ogImagePath('article', loc, article.slug),
        // The cover is the article's own picture; the generated card above is
        // what social platforms show, so the cover only serves as alt context.
        imageAlt: tr.title,
        publishedTime: article.publishedAt ?? article.createdAt,
        modifiedTime: article.updatedAt,
        tags: article.tags,
        section: article.categories?.[0]?.translations.find(
            t => t.locale === loc
        )?.name,
        // Plain-Markdown twin of this page, for readers (and crawlers) that
        // would rather not parse the HTML. See `./raw/route.ts`.
        types: {
            'text/markdown': absoluteUrl(
                localePath(loc, `/blog/${canonical}/raw`)
            ),
        },
    });
}

/**
 * Public article page. The backend only serves visible articles here, so a
 * draft slug 404s; drafts are reachable through `/blog/preview/[token]` only.
 */
export default async function ArticlePage(props: Props) {
    const { locale, slug } = await props.params;
    setRequestLocale(locale as Locale);
    const loc = locale as Locale;

    const resolved = await resolve(loc, slug);
    if (!resolved) notFound();
    const { article, canonical } = resolved;

    // Reached through another locale's slug (or the internal key): send the
    // reader, and the crawler, to the one canonical URL for this locale.
    if (slug !== canonical)
        permanentRedirect(localePath(loc, `/blog/${canonical}`));

    const tr = articleTranslation(article, loc);
    if (!tr) notFound();

    const t = await getTranslations('blog');
    const stats = readingTime(tr.body ?? '');
    // Read here rather than inside the widget: the discussion is content, and
    // content that only exists after hydration is content no crawler sees.
    const comments = await getArticleComments(article.id);

    return (
        <>
            <JsonLd
                data={graph([
                    blogPostingJsonLd({
                        article,
                        translation: tr,
                        locale: loc,
                        readingMinutes: Math.ceil(stats.minutes),
                        wordCount: stats.words,
                    }),
                    breadcrumbJsonLd(
                        [
                            { name: SITE.name, path: '' },
                            { name: t('title'), path: '/blog' },
                            { name: tr.title, path: `/blog/${canonical}` },
                        ],
                        loc
                    ),
                ])}
            />
            <ArticleView
                article={article}
                translation={tr}
                locale={loc}
                footer={
                    <ArticleFooter
                        articleId={article.id}
                        initialComments={comments}
                        locale={loc}
                        returnTo={localePath(loc, `/blog/${canonical}`)}
                    />
                }
            />
        </>
    );
}
