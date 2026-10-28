'use client';

import { ArticleComments } from '@/app/_components/blog/ArticleComments';
import { ArticleReactions } from '@/app/_components/blog/ArticleReactions';
import { ReaderSessionProvider } from '@/app/_components/blog/reader-session';
import type { Locale } from '@/config';
import type { CommentsPage } from '@/lib/comments';

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
    initialComments,
    locale,
    returnTo,
}: {
    articleId: string;
    /** First page of the discussion, read on the server. */
    initialComments: CommentsPage;
    locale: Locale;
    returnTo: string;
}) {
    return (
        <ReaderSessionProvider>
            <section className="mt-16 max-w-3xl border-border border-t pt-14 pb-4">
                <ArticleReactions articleId={articleId} />
                <div className="mt-16">
                    <ArticleComments
                        articleId={articleId}
                        initialComments={initialComments}
                        locale={locale}
                        returnTo={returnTo}
                    />
                </div>
            </section>
        </ReaderSessionProvider>
    );
}
