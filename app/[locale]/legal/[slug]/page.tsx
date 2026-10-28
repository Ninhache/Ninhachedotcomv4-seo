import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ralewaySemiBold } from '@/app/fonts';
import { type Locale, locales } from '@/config';
import { isLegalSlug, LEGAL_SLUGS, readLegalPage } from '@/lib/legal';
import { renderArticle } from '@/lib/markdown/render-article';
import { pageMetadata } from '@/lib/seo/metadata';

/*
 * Read at build time, rendered from `.next` afterwards. This is half of the
 * container fix: a page that read `content/` on demand would find nothing in
 * the runtime image, whose only copied directories are `.next`, `public` and
 * `fonts`. The other half is the `COPY --from=builder /app/content` line in
 * the dockerfile, which keeps the build itself able to read the sources.
 */
export const dynamic = 'force-static';

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

/**
 * Slug to translation key. The two do not match because the slugs are the
 * URLs, chosen in French and frozen there, while the keys are shared with the
 * footer and the consent line, which name the same three pages in both
 * languages.
 */
const TITLE_KEY = {
    cgu: 'cgu',
    'mentions-legales': 'mentions',
    confidentialite: 'privacy',
} as const;

export function generateStaticParams() {
    return locales.flatMap(locale =>
        LEGAL_SLUGS.map(slug => ({ locale, slug }))
    );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale, slug } = await props.params;
    if (!isLegalSlug(slug)) return {};
    const loc = locale as Locale;
    const t = await getTranslations({ locale: loc, namespace: 'legal' });

    return pageMetadata({
        locale: loc,
        path: `/legal/${slug}`,
        title: t(TITLE_KEY[slug]),
        description: t(`${TITLE_KEY[slug]}Description`),
    });
}

/**
 * The three legal pages, rendered from MDX files in the repository.
 *
 * They go through the article renderer rather than a plain Markdown pass so a
 * legal text can use the same callouts and anchored headings as an article.
 * Git is the version history, which is the property that matters most here:
 * knowing exactly what a policy said on the day someone signed up.
 */
export default async function LegalPage(props: Props) {
    const { locale, slug } = await props.params;
    if (!isLegalSlug(slug)) notFound();

    const loc = locale as Locale;
    setRequestLocale(loc);

    const source = await readLegalPage(slug, loc);
    if (source === null) notFound();

    const t = await getTranslations({ locale: loc, namespace: 'legal' });
    const { Content } = await renderArticle(source);

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
            <h1
                className={`text-3xl text-foreground sm:text-4xl ${ralewaySemiBold.className}`}
            >
                {t(TITLE_KEY[slug])}
            </h1>
            <div className="prose prose-invert mt-8 max-w-none leading-relaxed prose-headings:scroll-mt-24">
                {Content}
            </div>
        </main>
    );
}
