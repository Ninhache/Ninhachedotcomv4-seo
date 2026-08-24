import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArticleGrid, toPostCards } from '@/app/_components/blog/ArticleGrid';
import { CategoryFilter } from '@/app/_components/blog/CategoryFilter';
import { JsonLd } from '@/app/_components/seo/JsonLd';
import { ralewaySemiBold } from '@/app/fonts';
import type { Locale } from '@/config';
import { categoryName, getArticleCategories, getArticles } from '@/lib/blog';
import {
    articleCollectionJsonLd,
    breadcrumbJsonLd,
    graph,
} from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { ogImagePath } from '@/lib/seo/og';
import { SITE } from '@/lib/seo/site';
import type { ArticleCategoryDTO } from '@/lib/types';

/**
 * One blog category, as a real URL.
 *
 * The filter used to be `?cat=<slug>` on the index, which forced the whole
 * route to render dynamically for every visitor, filtered or not. As a segment
 * it is prerendered per category and per locale, so the filtered views are
 * cached like everything else, each one gets its own title and canonical, and
 * the filter is still a plain server round-trip with no client state.
 */

export const revalidate = 86400;

export async function generateStaticParams() {
    const categories = await getArticleCategories();
    return categories.map(c => ({ cat: c.slug }));
}

type Props = {
    params: Promise<{ locale: string; cat: string }>;
};

/** The category row for `slug`, or a 404 when the slug is not one. */
async function resolveCategory(slug: string): Promise<ArticleCategoryDTO> {
    const categories = await getArticleCategories();
    const category = categories.find(c => c.slug === slug);
    if (!category) notFound();
    return category;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale, cat } = await props.params;
    const loc = locale as Locale;
    const t = await getTranslations({ locale: loc, namespace: 'blog' });
    const [category, articles] = await Promise.all([
        resolveCategory(cat),
        getArticles(cat),
    ]);
    const name = categoryName(category, loc);

    return pageMetadata({
        locale: loc,
        path: `/blog/c/${category.slug}`,
        title: `${name} · ${t('title')}`,
        description: t('categoryIntro', { category: name }),
        image: ogImagePath('blog', loc),
        // A category nobody has published in yet is a real page (the chip
        // links to it) but an empty one, and an empty page has no business in
        // an index. `follow` stays on so the chips back to /blog are crawled.
        ...(articles.some(a => a.isVisible)
            ? {}
            : { robots: { index: false, follow: true } }),
    });
}

export default async function BlogCategoryPage(props: Props) {
    const { locale, cat } = await props.params;
    setRequestLocale(locale as Locale);
    const loc = locale as Locale;
    const t = await getTranslations('blog');

    const [category, articles, categories] = await Promise.all([
        resolveCategory(cat),
        getArticles(cat),
        getArticleCategories(),
    ]);

    const name = categoryName(category, loc);
    const intro = t('categoryIntro', { category: name });
    const posts = toPostCards(articles, loc);
    const chips = [...categories]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(c => ({ slug: c.slug, name: categoryName(c, loc) }));

    return (
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-32">
            <JsonLd
                data={graph([
                    articleCollectionJsonLd({
                        articles: articles.filter(a => a.isVisible),
                        locale: loc,
                        path: `/blog/c/${category.slug}`,
                        name: `${name} · ${t('title')}`,
                        description: intro,
                    }),
                    breadcrumbJsonLd(
                        [
                            { name: SITE.name, path: '' },
                            { name: t('title'), path: '/blog' },
                            { name, path: `/blog/c/${category.slug}` },
                        ],
                        loc
                    ),
                ])}
            />
            <header className="mb-10">
                <h1
                    className={`text-4xl font-bold tracking-tight sm:text-5xl ${ralewaySemiBold.className}`}
                >
                    {name}
                </h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p>
            </header>

            {chips.length > 0 && (
                <div className="mb-8">
                    <CategoryFilter categories={chips} active={category.slug} />
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
