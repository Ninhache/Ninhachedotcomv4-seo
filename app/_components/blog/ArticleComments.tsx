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

/**
 * How many times replies may shift right before the indent stops growing.
 *
 * The API lets a thread nest deeper than this, and it keeps nesting: past this
 * depth the answers are still children in the markup and still read in order,
 * they simply stop eating the width. On a phone the fifth indent would leave a
 * column of about three words.
 */
const MAX_INDENT_DEPTH = 4;

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
 * Being frameless is also what makes the hover honest: `group` here covers the
 * message and nothing else, so hovering an answer no longer lights up the whole
 * thread above it.
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
                    // takes focus, so a thread is a column of text and not a
                    // column of bins. Kept unconditionally visible below `sm`:
                    // a touch screen never hovers, and a control that only
                    // appears on hover is a control that does not exist there.
                    className="opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            )}
        </div>
    );
}

/**
 * What every message in a thread needs and none of it depends on which message
 * it is. Passed down whole rather than as ten props repeated at each level: the
 * recursion below would otherwise thread the same arguments through by hand at
 * every depth.
 */
type ThreadContext = {
    locale: Locale;
    /** Signed-in reader, or null. Only their own messages get a bin. */
    readerId: string | null;
    /** Id of the message whose reply box is open, if any. */
    replyTo: string | null;
    replyBody: string;
    submitting: boolean;
    onReply: (id: string) => void;
    onRemove: (id: string) => void;
    onReplyBodyChange: (value: string) => void;
    onSubmitReply: (parentId: string) => void;
    onCancelReply: () => void;
};

/**
 * A message and everything written under it, recursively.
 *
 * The indent line is drawn by the parent around its children rather than by
 * each child around itself, so one border spans the whole block of answers
 * instead of one border per answer.
 *
 * `depth` exists only for that indent. It is not the tree's depth of record:
 * the server decides how deep a reply actually sits and re-parents anything
 * past its own cap, which is why replies are inserted by the `parentId` it
 * returns and not by the one that was asked for.
 */
function CommentThread({
    comment,
    depth,
    context,
}: {
    comment: CommentDTO;
    depth: number;
    context: ThreadContext;
}) {
    const t = useTranslations('comments');
    const composerOpen = context.replyTo === comment.id;

    return (
        <div>
            <CommentCard
                comment={comment}
                locale={context.locale}
                canDelete={
                    !!context.readerId &&
                    context.readerId === comment.reader?.id
                }
                onRemove={() => context.onRemove(comment.id)}
                onReply={() => context.onReply(comment.id)}
            />
            {(comment.replies.length > 0 || composerOpen) && (
                <div
                    className={cn(
                        'mt-6 space-y-6',
                        depth < MAX_INDENT_DEPTH &&
                            'border-border border-l pl-5',
                        // Only the first level clears the avatar; below that the
                        // indent already starts past it.
                        depth === 0 && 'sm:ml-15'
                    )}
                >
                    {comment.replies.map(reply => (
                        <CommentThread
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            context={context}
                        />
                    ))}
                    {composerOpen && (
                        <CommentComposer
                            id={`reply-${comment.id}`}
                            value={context.replyBody}
                            placeholder={t('replyPlaceholder')}
                            submitting={context.submitting}
                            onChange={context.onReplyBodyChange}
                            onSubmit={() => context.onSubmitReply(comment.id)}
                            onCancel={context.onCancelReply}
                            cancelLabel={t('cancel')}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Inserts a freshly posted message under the one the server attached it to.
 *
 * It follows `created.parentId`, not the id the reply was aimed at: past the
 * server's depth cap those two differ, and following the answer keeps this list
 * showing the tree that was actually stored.
 */
function insertReply(nodes: CommentDTO[], created: CommentDTO): CommentDTO[] {
    return nodes.map(node =>
        node.id === created.parentId
            ? { ...node, replies: [...node.replies, created] }
            : { ...node, replies: insertReply(node.replies, created) }
    );
}

/**
 * Drops a message wherever it sits. Its answers go with it, which is what the
 * database does too: the foreign key cascades down the branch.
 */
function removeFromTree(nodes: CommentDTO[], id: string): CommentDTO[] {
    return nodes
        .filter(node => node.id !== id)
        .map(node => ({ ...node, replies: removeFromTree(node.replies, id) }));
}

/** Every message in the tree, at any depth. */
function countAll(nodes: CommentDTO[]): number {
    return nodes.reduce((sum, node) => sum + 1 + countAll(node.replies), 0);
}

/**
 * The discussion under an article: the way to add a message first, then the
 * threads, newest first, each with its answers nested underneath.
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
            setItems(prev => insertReply(prev, created));
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
            setItems(prev => removeFromTree(prev, id));
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        }
    };

    const openReply = (id: string) => {
        if (!reader || reader.needsName) {
            promptLogin();
            return;
        }
        setReplyBody('');
        setReplyTo(id);
    };

    const context: ThreadContext = {
        locale,
        readerId: reader?.id ?? null,
        replyTo,
        replyBody,
        submitting,
        onReply: openReply,
        onRemove: remove,
        onReplyBodyChange: setReplyBody,
        onSubmitReply: submitReply,
        onCancelReply: () => setReplyTo(null),
    };

    const replyTotal = countAll(items) - items.length;

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
                            <CommentThread
                                comment={root}
                                depth={0}
                                context={context}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
