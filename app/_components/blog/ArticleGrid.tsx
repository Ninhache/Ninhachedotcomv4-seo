import readingTime from 'reading-time';
import AnimatedComponent from '@/app/_components/AnimatedComponent';
import { PostCard, type PostCardData } from '@/app/_components/blog/PostCard';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import {
    articleTranslation,
    categoryName,
    formatArticleDate,
} from '@/lib/blog';
import type { ArticleDTO } from '@/lib/types';

/**
 * The bento grid of article teasers, shared by `/blog` and by the per-category
 * views under `/blog/c/<slug>`.
 *
 * Both routes render the exact same list from the same backend shape, so the
 * mapping and the grid live here rather than being duplicated: a change to the
 * card data (a new field, another fallback) can only be made in one place.
 */

/** Backend articles to card data, in the order the backend returned them. */
export function toPostCards(
    articles: ArticleDTO[],
    locale: Locale
): PostCardData[] {
    return articles
        .filter(a => a.isVisible)
        .map(a => {
            const tr = articleTranslation(a, locale);
            return {
                slug: a.slug,
                title: tr?.title ?? a.slug,
                excerpt: tr?.excerpt ?? '',
                dateLabel: formatArticleDate(a.publishedAt, locale),
                readingMinutes: Math.max(
                    1,
                    Math.ceil(readingTime(tr?.body ?? '').minutes)
                ),
                coverUrl: a.coverImageUrl ? mediaSrc(a.coverImageUrl) : null,
                categories: (a.categories ?? []).map(c => ({
                    slug: c.slug,
                    name: categoryName(c, locale),
                })),
            };
        });
}

/**
 * Bento span for a card at `index`: the first post is a big 2x2 feature, then a
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

export function ArticleGrid({
    posts,
    readMinutesLabel,
    emptyLabel,
}: {
    posts: PostCardData[];
    readMinutesLabel: string;
    emptyLabel: string;
}) {
    if (posts.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
                {emptyLabel}
            </p>
        );
    }

    return (
        <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            style={{
                gridAutoRows: '13rem',
                gridAutoFlow: 'dense',
            }}
        >
            {posts.map((post, i) => (
                <div key={post.slug} className={bentoSpan(i)}>
                    <AnimatedComponent
                        delay={Math.min(i, 6) * 70}
                        customCss={{ height: '100%' }}
                    >
                        <PostCard
                            post={post}
                            readMinutesLabel={readMinutesLabel}
                            featured={i === 0}
                        />
                    </AnimatedComponent>
                </div>
            ))}
        </div>
    );
}
