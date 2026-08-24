import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArticleGrid, toPostCards } from '@/app/_components/blog/ArticleGrid';
import { CategoryFilter } from '@/app/_components/blog/CategoryFilter';
import { JsonLd } from '@/app/_components/seo/JsonLd';
import { ralewaySemiBold } from '@/app/fonts';
import type { Locale } from '@/config';
import { categoryName, getArticleCategories, getArticles } from '@/lib/blog';
import { blogJsonLd, breadcrumbJsonLd, graph } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { ogImagePath } from '@/lib/seo/og';
import { SITE } from '@/lib/seo/site';

// ISR: statically rendered, refreshed at most daily; freshness otherwise comes
// from tag invalidation (the back busts `articles` on any edit — no restart).
export const revalidate = 86400;

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale } = await props.params;
    const loc = locale as Locale;
    const t = await getTranslations({ locale: loc, namespace: 'blog' });

    return pageMetadata({
        locale: loc,
        path: '/blog',
        title: t('title'),
        description: t('intro'),
        image: ogImagePath('blog', loc),
    });
}

/**
 * Public blog index: every visible article, in a bento grid.
 *
 * Reads no search param on purpose. Filtering used to be `?cat=<slug>`, which
 * made the whole route dynamic for the sake of one optional value; each
 * category is now its own prerendered segment (`/blog/c/<slug>`), so every blog
 * URL is served from the ISR cache and the filter stays a server round-trip.
 */
export default async function BlogListPage(props: Props) {
    const { locale } = await props.params;
    setRequestLocale(locale as Locale);
    const loc = locale as Locale;
    const t = await getTranslations('blog');

    const [articles, categories] = await Promise.all([
        getArticles(),
        getArticleCategories(),
    ]);

    const posts = toPostCards(articles, loc);
    const chips = [...categories]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(c => ({ slug: c.slug, name: categoryName(c, loc) }));

    return (
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-32">
            <JsonLd
                data={graph([
                    blogJsonLd(
                        articles.filter(a => a.isVisible),
                        loc,
                        t('title'),
                        t('intro')
                    ),
                    breadcrumbJsonLd(
                        [
                            { name: SITE.name, path: '' },
                            { name: t('title'), path: '/blog' },
                        ],
                        loc
                    ),
                ])}
            />
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
                    <CategoryFilter categories={chips} />
                </div>
            )}

            <ArticleGrid
                posts={posts}
                readMinutesLabel={t('minutesShort')}
                emptyLabel={t('empty')}
            />
        </main>
    );
}
