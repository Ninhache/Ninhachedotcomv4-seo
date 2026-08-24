import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArticleView } from '@/app/_components/blog/ArticleView';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import { articleTranslation, getArticleBySlug, getArticles } from '@/lib/blog';

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
    const article = await getArticleBySlug(slug);
    if (!article) return {};
    const tr = articleTranslation(article, locale as Locale);
    const cover = article.coverImageUrl
        ? mediaSrc(article.coverImageUrl)
        : undefined;
    return {
        title: tr?.title,
        description: tr?.excerpt,
        openGraph: {
            title: tr?.title,
            description: tr?.excerpt,
            type: 'article',
            images: cover ? [{ url: cover }] : undefined,
        },
    };
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

    return <ArticleView article={article} translation={tr} locale={loc} />;
}
