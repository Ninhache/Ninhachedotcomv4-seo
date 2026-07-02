import { Calendar, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReadingProgressBar } from '@/app/_components/blog/ReadingProgressBar';
import { TableOfContents } from '@/app/_components/blog/TableOfContents';
import Header from '@/app/_components/header/header';
import { ralewaySemiBold } from '@/app/fonts';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import {
    articleTranslation,
    categoryName,
    formatArticleDate,
    getArticleBySlug,
    getArticles,
} from '@/lib/blog';
import { renderArticle } from '@/lib/markdown/render-article';
import { Link } from '@/navigation';

export const revalidate = 86400;

// The article id the progress bar measures against.
const ARTICLE_ID = 'blog-article';

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
 * Public article page. The Markdown body is rendered to HTML entirely on the
 * server (build/ISR time) — none of the markdown toolchain ships to the client.
 * The reading-progress bar and TOC are the only client islands.
 */
export default async function ArticlePage(props: Props) {
    const { locale, slug } = await props.params;
    setRequestLocale(locale as Locale);
    const loc = locale as Locale;
    const t = await getTranslations('blog');

    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    const tr = articleTranslation(article, loc);
    if (!tr) notFound();

    const { html, toc, readingMinutes } = await renderArticle(tr.body);
    const cover = article.coverImageUrl
        ? mediaSrc(article.coverImageUrl)
        : null;
    const dateLabel = formatArticleDate(article.publishedAt, loc);
    const categories = (article.categories ?? []).map(c => ({
        slug: c.slug,
        name: categoryName(c, loc),
    }));

    return (
        <>
            <ReadingProgressBar targetId={ARTICLE_ID} />
            <Header />

            <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
                <Link
                    href="/blog"
                    className="mb-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    ← {t('backToList')}
                </Link>

                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
                    <article id={ARTICLE_ID} className="min-w-0">
                        {categories.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {categories.map(c => (
                                    <Link
                                        key={c.slug}
                                        href={`/blog?cat=${encodeURIComponent(c.slug)}`}
                                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                                    >
                                        {c.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <h1
                            className={`text-3xl font-bold leading-tight tracking-tight sm:text-4xl ${ralewaySemiBold.className}`}
                        >
                            {tr.title}
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {dateLabel && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {dateLabel}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {readingMinutes} {t('minutesShort')}
                            </span>
                        </div>

                        {cover && (
                            <img
                                src={cover}
                                alt=""
                                className="mt-6 aspect-[16/9] w-full rounded-xl object-cover"
                            />
                        )}

                        {/* Body is server-rendered, sanitized-by-construction HTML. */}
                        <div
                            className="prose prose-invert mt-8 max-w-none prose-headings:scroll-mt-24 prose-pre:bg-transparent prose-pre:p-0"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </article>

                    <aside className="hidden lg:block">
                        <div className="sticky top-24">
                            <TableOfContents toc={toc} />
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}
