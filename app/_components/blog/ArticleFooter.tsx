'use client';

import { useTranslations } from 'next-intl';
import { ArticleComments } from '@/app/_components/blog/ArticleComments';
import { ArticleReactions } from '@/app/_components/blog/ArticleReactions';
import { ReaderIdentity } from '@/app/_components/blog/ReaderIdentity';
import { ReaderSessionProvider } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
import type { Locale } from '@/config';

/**
 * Reactions and comments, composed under a single reader session.
 *
 * Rendered outside `<article>` on purpose: the reading-progress bar measures
 * that element, and a long thread would otherwise count as article left to
 * read. Only the public article page mounts this, so the private review route
 * gets neither widget without needing a flag.
 */
export function ArticleFooter({
    articleId,
    locale,
    returnTo,
}: {
    articleId: string;
    locale: Locale;
    returnTo: string;
}) {
    const t = useTranslations('comments');

    return (
        <ReaderSessionProvider>
            <section className="mt-12 max-w-3xl border-t border-border pt-8">
                <ArticleReactions articleId={articleId} />

                <h2
                    className={`mt-10 text-xl font-semibold ${ralewaySemiBold.className}`}
                >
                    {t('title')}
                </h2>
                <div className="mt-4">
                    <ReaderIdentity returnTo={returnTo} />
                </div>
                <div className="mt-6">
                    <ArticleComments articleId={articleId} locale={locale} />
                </div>
            </section>
        </ReaderSessionProvider>
    );
}
