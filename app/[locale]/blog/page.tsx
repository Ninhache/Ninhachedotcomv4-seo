import { getTranslations, setRequestLocale } from 'next-intl/server';
import readingTime from 'reading-time';
import { CategoryFilter } from '@/app/_components/blog/CategoryFilter';
import { PostCard, type PostCardData } from '@/app/_components/blog/PostCard';
import { ralewaySemiBold } from '@/app/fonts';
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
 * Bento span for a card at `index`: the first post is a big 2×2 feature, then a
 * repeating rhythm of wide/tall tiles fills the grid (with `grid-auto-flow:
 * dense` packing the gaps). Only standard span utilities so Tailwind generates
 * them reliably.
 */
function bentoSpan(index: number): string {
    if (index === 0) return 'sm:col-span-2 sm:row-span-2';
    if (index % 5 === 3) return 'sm:col-span-2';
    if (index % 6 === 5) return 'sm:row-span-2';
    return '';
}

/**
 * Public blog index: a bento grid of article teasers, styled in the portfolio's
 * art direction. The category filter is driven by the `?cat=<slug>` search
 * param (a real server round-trip), so the backend does the filtering.
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
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
            <header className="mb-10">
                <h1
                    className={`text-4xl font-bold tracking-tight sm:text-5xl ${ralewaySemiBold.className}`}
                >
                    {t('title')}
                </h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">
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
                <p className="rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
                    {t('empty')}
                </p>
            ) : (
                <div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    style={{
                        gridAutoRows: '13rem',
                        gridAutoFlow: 'dense',
                    }}
                >
                    {posts.map((post, i) => (
                        <div key={post.slug} className={bentoSpan(i)}>
                            <PostCard
                                post={post}
                                readMinutesLabel={t('minutesShort')}
                                featured={i === 0}
                            />
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
