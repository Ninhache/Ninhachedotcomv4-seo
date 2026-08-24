import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import readingTime from 'reading-time';
import { ArticleView } from '@/app/_components/blog/ArticleView';
import { JsonLd } from '@/app/_components/seo/JsonLd';
import type { Locale } from '@/config';
import { articleTranslation, getArticleBySlug, getArticles } from '@/lib/blog';
import { blogPostingJsonLd, breadcrumbJsonLd, graph } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { ogImagePath } from '@/lib/seo/og';
import { absoluteUrl, localePath, SITE } from '@/lib/seo/site';

export const revalidate = 86400;

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

/**
 * Pre-render every visible article at build time (per locale — the locale axis
 * is contributed by the parent `[locale]/layout.tsx`). New/unknown slugs still
 * resolve at request time then get cached by ISR. `getArticles()` never throws
 * (its fetch falls back to `[]`), so a backend blip just yields no static paths.
 */
export async function generateStaticParams() {
    const articles = await getArticles();
    return articles.filter(a => a.isVisible).map(a => ({ slug: a.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale, slug } = await props.params;
    const loc = locale as Locale;
    const article = await getArticleBySlug(slug);

    // An unknown slug renders a 404 below. Returning `{}` here used to let the
    // layout's defaults describe the page instead, which is how a missing
    // article ended up advertised with the site's generic title.
    if (!article) {
        return { title: 'Article', robots: { index: false, follow: false } };
    }

    const tr = articleTranslation(article, loc);
    if (!tr) {
        return { title: 'Article', robots: { index: false, follow: false } };
    }

    return pageMetadata({
        locale: loc,
        path: `/blog/${article.slug}`,
        title: tr.title,
        description: tr.excerpt,
        type: 'article',
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
                localePath(loc, `/blog/${article.slug}/raw`)
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

    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    const tr = articleTranslation(article, loc);
    if (!tr) notFound();

    const t = await getTranslations('blog');
    const stats = readingTime(tr.body ?? '');

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
                            { name: tr.title, path: `/blog/${article.slug}` },
                        ],
                        loc
                    ),
                ])}
            />
            <ArticleView article={article} translation={tr} locale={loc} />
        </>
    );
}
