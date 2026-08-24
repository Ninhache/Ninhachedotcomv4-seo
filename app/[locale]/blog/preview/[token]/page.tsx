import { EyeOff } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArticleView } from '@/app/_components/blog/ArticleView';
import { ralewaySemiBold } from '@/app/fonts';
import type { Locale } from '@/config';
import { articleTranslation, getArticleByPreviewToken } from '@/lib/blog';

// A review link must always show the draft as it stands right now, so this page
// opts out of every cache layer: no ISR entry, no static shell, no prerender at
// build time (the token is unknown then anyway).
export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ locale: string; token: string }>;
};

/**
 * `noindex, nofollow` is the real guarantee that a draft stays out of search
 * results (the `Disallow` in robots.txt only stops well-behaved crawlers from
 * fetching the URL, and a Disallow'd page can still be indexed from a link).
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale, token } = await props.params;
    const article = await getArticleByPreviewToken(token);
    const t = await getTranslations({ locale, namespace: 'blog' });
    const tr = article
        ? articleTranslation(article, locale as Locale)
        : undefined;
    return {
        title: tr ? `${t('previewBadge')} · ${tr.title}` : t('previewBadge'),
        robots: { index: false, follow: false },
    };
}

/**
 * Private review page. The token in the URL is the only credential: the backend
 * resolves it without any visibility check, and an unknown or revoked token
 * yields a plain 404. Rendering goes through the same `ArticleView` as the
 * public page, under the same blog layout, so a reviewer sees exactly what
 * publishing will produce, plus a notice making the draft status explicit.
 */
export default async function ArticlePreviewPage(props: Props) {
    const { locale, token } = await props.params;
    setRequestLocale(locale as Locale);
    const loc = locale as Locale;
    const t = await getTranslations('blog');

    const article = await getArticleByPreviewToken(token);
    if (!article) notFound();

    const tr = articleTranslation(article, loc);
    if (!tr) notFound();

    const banner = (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
                <p
                    className={`text-sm text-foreground ${ralewaySemiBold.className}`}
                >
                    {t('previewBadge')}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {t('previewNotice')}
                </p>
            </div>
        </div>
    );

    return (
        <ArticleView
            article={article}
            translation={tr}
            locale={loc}
            banner={banner}
        />
    );
}
