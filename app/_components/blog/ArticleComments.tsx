'use client';

import { Reply, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CommentComposer } from '@/app/_components/blog/CommentComposer';
import { ReaderIdentity } from '@/app/_components/blog/ReaderIdentity';
import { ReaderLoginPanel } from '@/app/_components/blog/ReaderLoginPanel';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/config';
import { type CommentDTO, ReaderApi } from '@/lib/reader/reader.api';
import { cn } from '@/lib/utils';

function formatDate(iso: string, locale: Locale) {
    return new Date(iso).toLocaleDateString(
        locale === 'fr' ? 'fr-FR' : 'en-US',
        {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }
    );
}

/**
 * One message: the same card whether it opens a thread or answers one, only
 * narrower and without its own reply button when it is an answer.
 *
 * Bodies are plain text end to end. They are stored as typed and rendered by
 * React, so they are escaped; `whitespace-pre-wrap` is the entire formatting
 * budget. No Markdown, no HTML: that is the XSS surface this refuses to open.
 */
function CommentCard({
    comment,
    locale,
    canDelete,
    onRemove,
    onReply,
    children,
}: {
    comment: CommentDTO;
    locale: Locale;
    canDelete: boolean;
    onRemove: () => void;
    onReply?: () => void;
    children?: React.ReactNode;
}) {
    const t = useTranslations('comments');

    return (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex gap-4">
                {comment.reader.avatarUrl ? (
                    <img
                        src={comment.reader.avatarUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-medium text-base text-foreground">
                            {comment.reader.displayName}
                        </span>
                        <time
                            dateTime={comment.createdAt}
                            className="text-muted-foreground text-xs"
                        >
                            {formatDate(comment.createdAt, locale)}
                        </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-base text-muted-foreground leading-relaxed">
                        {comment.body}
                    </p>
                    {onReply && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 mt-2 rounded-full text-muted-foreground hover:text-primary"
                            onClick={onReply}
                        >
                            <Reply className="mr-1.5 h-4 w-4" />
                            {t('reply')}
                        </Button>
                    )}
                </div>
                {canDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('delete')}
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </div>
            {children}
        </div>
    );
}

/**
 * The discussion under an article: the way to add a message first, then the
 * threads, newest first, each with its replies.
 *
 * Threads are one level deep. The API flattens an answer to an answer back onto
 * its root, so this only ever renders two levels no matter what is posted.
 */
export function ArticleComments({
    articleId,
    locale,
    returnTo,
}: {
    articleId: string;
    locale: Locale;
    returnTo: string;
}) {
    const t = useTranslations('comments');
    const { reader, loading: sessionLoading, promptLogin } = useReaderSession();
    const [items, setItems] = useState<CommentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        ReaderApi.findComments(articleId)
            .then(({ items: comments }) => {
                if (!cancelled) setItems(comments);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [articleId]);

    const submit = async () => {
        const trimmed = body.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const created = await ReaderApi.createComment(
                articleId,
                trimmed,
                locale
            );
            setItems(prev => [created, ...prev]);
            setBody('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    const submitReply = async (parentId: string) => {
        const trimmed = replyBody.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const created = await ReaderApi.createComment(
                articleId,
                trimmed,
                locale,
                parentId
            );
            setItems(prev =>
                prev.map(root =>
                    root.id === parentId
                        ? { ...root, replies: [...root.replies, created] }
                        : root
                )
            );
            setReplyBody('');
            setReplyTo(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async (id: string) => {
        try {
            await ReaderApi.removeComment(id);
            // Deleting a root takes its replies with it on the API too, through
            // the schema's cascade.
            setItems(prev =>
                prev
                    .filter(root => root.id !== id)
                    .map(root => ({
                        ...root,
                        replies: root.replies.filter(r => r.id !== id),
                    }))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        }
    };

    const openReply = (id: string) => {
        if (!reader) {
            promptLogin();
            return;
        }
        setReplyBody('');
        setReplyTo(id);
    };

    const replyTotal = items.reduce(
        (sum, root) => sum + root.replies.length,
        0
    );

    return (
        <div>
            <h2
                className={cn(
                    'text-2xl text-foreground',
                    ralewaySemiBold.className
                )}
            >
                {t('title')}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
                {t('commentCount', { count: items.length })}
                {' · '}
                {t('replyCount', { count: replyTotal })}
            </p>

            <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3
                        className={cn(
                            'text-foreground text-xl',
                            ralewaySemiBold.className
                        )}
                    >
                        {t('addTitle')}
                    </h3>
                    <ReaderIdentity />
                </div>

                {error && (
                    <p className="mt-4 text-destructive text-sm">{error}</p>
                )}

                {!sessionLoading &&
                    (reader ? (
                        <CommentComposer
                            id="comment-body"
                            className="mt-5"
                            value={body}
                            placeholder={t('placeholder')}
                            submitting={submitting}
                            onChange={setBody}
                            onSubmit={submit}
                        />
                    ) : (
                        <div className="mt-5">
                            <ReaderLoginPanel returnTo={returnTo} />
                        </div>
                    ))}
            </div>

            {loading ? (
                <p className="mt-10 text-center text-muted-foreground text-sm">
                    {t('loading')}
                </p>
            ) : items.length === 0 ? (
                <p className="mt-10 text-center text-muted-foreground text-sm">
                    {t('empty')}
                </p>
            ) : (
                <ul className="mt-10 space-y-4">
                    {items.map(root => (
                        <li key={root.id}>
                            <CommentCard
                                comment={root}
                                locale={locale}
                                canDelete={reader?.id === root.reader.id}
                                onRemove={() => remove(root.id)}
                                onReply={() => openReply(root.id)}
                            >
                                {(root.replies.length > 0 ||
                                    replyTo === root.id) && (
                                    <div className="mt-5 space-y-4 border-border border-l pl-5 sm:ml-15">
                                        {root.replies.map(reply => (
                                            <CommentCard
                                                key={reply.id}
                                                comment={reply}
                                                locale={locale}
                                                canDelete={
                                                    reader?.id ===
                                                    reply.reader.id
                                                }
                                                onRemove={() =>
                                                    remove(reply.id)
                                                }
                                            />
                                        ))}
                                        {replyTo === root.id && (
                                            <CommentComposer
                                                id={`reply-${root.id}`}
                                                value={replyBody}
                                                placeholder={t(
                                                    'replyPlaceholder'
                                                )}
                                                submitting={submitting}
                                                onChange={setReplyBody}
                                                onSubmit={() =>
                                                    submitReply(root.id)
                                                }
                                                onCancel={() =>
                                                    setReplyTo(null)
                                                }
                                                cancelLabel={t('cancel')}
                                            />
                                        )}
                                    </div>
                                )}
                            </CommentCard>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
