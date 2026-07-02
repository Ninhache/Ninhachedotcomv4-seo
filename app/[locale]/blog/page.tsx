import { getTranslations, setRequestLocale } from 'next-intl/server';
import readingTime from 'reading-time';
import { BlogHeader } from '@/app/_components/blog/BlogHeader';
import { CategoryFilter } from '@/app/_components/blog/CategoryFilter';
import { PostCard, type PostCardData } from '@/app/_components/blog/PostCard';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import {
    articleTranslation,
    categoryName,
    formatArticleDate,
    getArticleCategories,
    getArticles,
} from '@/lib/blog';

// ISR: statically rendered, refreshed at most daily; freshness otherwise comes
// from tag invalidation (the back busts `articles` on any edit — no restart).
export const revalidate = 86400;

type Props = {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ cat?: string }>;
};

/**
 * Public blog index: a category-filterable grid of article teasers. The filter
 * is driven by the `?cat=<slug>` search param (a real server round-trip), so the
 * backend does the filtering and the page stays cache-friendly.
 */
export default async function BlogListPage(props: Props) {
    const { locale } = await props.params;
    const { cat } = await props.searchParams;
    setRequestLocale(locale as Locale);
    const loc = locale as Locale;
    const t = await getTranslations('blog');

    const [articles, categories] = await Promise.all([
        getArticles(cat),
        getArticleCategories(),
    ]);

    const posts: PostCardData[] = articles
        .filter(a => a.isVisible)
        .map(a => {
            const tr = articleTranslation(a, loc);
            return {
                slug: a.slug,
                title: tr?.title ?? a.slug,
                excerpt: tr?.excerpt ?? '',
                dateLabel: formatArticleDate(a.publishedAt, loc),
                readingMinutes: Math.max(
                    1,
                    Math.ceil(readingTime(tr?.body ?? '').minutes)
                ),
                coverUrl: a.coverImageUrl ? mediaSrc(a.coverImageUrl) : null,
                categories: (a.categories ?? []).map(c => ({
                    slug: c.slug,
                    name: categoryName(c, loc),
                })),
            };
        });

    const chips = [...categories]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(c => ({ slug: c.slug, name: categoryName(c, loc) }));

    return (
        <>
            <BlogHeader />
            <main className="mx-auto max-w-5xl px-4 py-10">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {t('title')}
                    </h1>
                    <p className="mt-2 max-w-2xl text-muted-foreground">
                        {t('intro')}
                    </p>
                </header>

                {chips.length > 0 && (
                    <div className="mb-8">
                        <CategoryFilter
                            categories={chips}
                            active={cat}
                            allLabel={t('allCategories')}
                        />
                    </div>
                )}

                {posts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
                        {t('empty')}
                    </p>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.map(post => (
                            <PostCard
                                key={post.slug}
                                post={post}
                                readMinutesLabel={t('minutesShort')}
                            />
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
