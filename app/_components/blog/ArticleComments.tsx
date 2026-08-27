'use client';

import { Reply, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CommentComposer } from '@/app/_components/blog/CommentComposer';
import { ReaderIdentity } from '@/app/_components/blog/ReaderIdentity';
import { ReaderLoginPanel } from '@/app/_components/blog/ReaderLoginPanel';
import { ReaderNamePrompt } from '@/app/_components/blog/ReaderNamePrompt';
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
 * One message: the same block whether it opens a thread or answers one.
 *
 * No frame, no background, no padding. A comment is text with a face next to
 * it; boxing each one, then boxing the answers inside that box, produced a
 * nest of borders that read as structure the conversation does not have. The
 * indent line on the replies carries that structure on its own.
 *
 * Being frameless is also what makes the hover honest: a reply is a sibling of
 * the message it answers, not a child of it, so `group` here covers exactly one
 * message and hovering an answer no longer lights up the whole thread.
 *
 * Answering an answer aims at the thread, not at the message: `onReply` is
 * handed the root id in both cases. That is exactly what the API does with a
 * reply-to-a-reply anyway (it re-attaches it to the root), so sending the root
 * id keeps the list this component holds in step with what the server stored.
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
}: {
    comment: CommentDTO;
    locale: Locale;
    canDelete: boolean;
    onRemove: () => void;
    onReply?: () => void;
}) {
    const t = useTranslations('comments');

    return (
        <div className="group flex gap-4">
            {comment.reader?.avatarUrl ? (
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
                    <span
                        className={cn(
                            'font-medium text-base',
                            comment.reader
                                ? 'text-foreground'
                                : 'text-muted-foreground italic'
                        )}
                    >
                        {comment.reader?.displayName ?? t('deletedAuthor')}
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
                    // Hidden until this message is hovered or something in it
                    // takes focus, so a thread reads as text and not as a row
                    // of buttons. Kept unconditionally visible below `sm`: a
                    // touch screen never hovers, and an invisible delete button
                    // is the same as no delete button.
                    className="opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            )}
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
        // `needsName` lands on the same prompt as being signed out: in both
        // cases something has to happen at the bottom of the page before a
        // reply can be written, and the API refuses either way.
        if (!reader || reader.needsName) {
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
                    (!reader ? (
                        <div className="mt-5">
                            <ReaderLoginPanel returnTo={returnTo} />
                        </div>
                    ) : reader.needsName ? (
                        <ReaderNamePrompt className="mt-5" />
                    ) : (
                        <CommentComposer
                            id="comment-body"
                            className="mt-5"
                            value={body}
                            placeholder={t('placeholder')}
                            submitting={submitting}
                            onChange={setBody}
                            onSubmit={submit}
                        />
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
                <ul className="mt-10 divide-y divide-border">
                    {items.map(root => (
                        <li key={root.id} className="py-8 first:pt-0">
                            <CommentCard
                                comment={root}
                                locale={locale}
                                canDelete={
                                    !!reader && reader.id === root.reader?.id
                                }
                                onRemove={() => remove(root.id)}
                                onReply={() => openReply(root.id)}
                            />
                            {(root.replies.length > 0 ||
                                replyTo === root.id) && (
                                <div className="mt-6 space-y-6 border-border border-l pl-5 sm:ml-15">
                                    {root.replies.map(reply => (
                                        <CommentCard
                                            key={reply.id}
                                            comment={reply}
                                            locale={locale}
                                            canDelete={
                                                !!reader &&
                                                reader.id === reply.reader?.id
                                            }
                                            onRemove={() => remove(reply.id)}
                                            onReply={() => openReply(root.id)}
                                        />
                                    ))}
                                    {replyTo === root.id && (
                                        <CommentComposer
                                            id={`reply-${root.id}`}
                                            value={replyBody}
                                            placeholder={t('replyPlaceholder')}
                                            submitting={submitting}
                                            onChange={setReplyBody}
                                            onSubmit={() =>
                                                submitReply(root.id)
                                            }
                                            onCancel={() => setReplyTo(null)}
                                            cancelLabel={t('cancel')}
                                        />
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
