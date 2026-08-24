import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ReadingProgressBar } from '@/app/_components/blog/ReadingProgressBar';
import { TableOfContents } from '@/app/_components/blog/TableOfContents';
import { ralewaySemiBold } from '@/app/fonts';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import { categoryName, formatArticleDate } from '@/lib/blog';
import { renderArticle } from '@/lib/markdown/render-article';
import type { ArticleDTO, ArticleTranslationDTO } from '@/lib/types';
import { Link } from '@/navigation';

// The article id the progress bar measures against.
const ARTICLE_ID = 'blog-article';

type Props = {
    article: ArticleDTO;
    /** Already resolved by the caller, which is also what decides a 404. */
    translation: ArticleTranslationDTO;
    locale: Locale;
    /** Slot above the article, used by the private review route for its notice. */
    banner?: ReactNode;
};

/**
 * The rendered article itself: header, cover, MDX body and table of contents.
 *
 * Shared verbatim by the public `/blog/[slug]` page and the private
 * `/blog/preview/[token]` page, so what a reviewer sees is exactly what gets
 * published. The Markdown body is compiled server-side (build/ISR time for the
 * public route, per request for the preview): none of the markdown toolchain
 * ships to the client. The reading-progress bar and TOC are the only islands.
 */
export async function ArticleView({
    article,
    translation,
    locale,
    banner,
}: Props) {
    const t = await getTranslations('blog');

    const { Content, toc, readingMinutes } = await renderArticle(
        translation.body
    );
    const cover = article.coverImageUrl
        ? mediaSrc(article.coverImageUrl)
        : null;
    const dateLabel = formatArticleDate(article.publishedAt, locale);
    const categories = (article.categories ?? []).map(c => ({
        slug: c.slug,
        name: categoryName(c, locale),
    }));

    return (
        <>
            <ReadingProgressBar targetId={ARTICLE_ID} />

            <main className="mx-auto max-w-6xl px-4 pb-16 pt-32">
                {banner}

                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="mb-6 rounded-full border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground"
                >
                    <Link href="/blog">
                        <ArrowLeft />
                        {t('backToList')}
                    </Link>
                </Button>

                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
                    <article id={ARTICLE_ID} className="min-w-0 max-w-3xl">
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
                            {translation.title}
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

                        {/* Body is server-compiled MDX (components already bound). */}
                        <div className="prose prose-lg prose-invert mt-8 max-w-none leading-relaxed prose-headings:scroll-mt-24 prose-pre:bg-transparent prose-pre:p-0">
                            {Content}
                        </div>
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
