'use client';

import { ChevronDown, ChevronRight, Reply, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { CommentComposer } from '@/app/_components/blog/CommentComposer';
import { ReaderIdentity } from '@/app/_components/blog/ReaderIdentity';
import { ReaderLoginPanel } from '@/app/_components/blog/ReaderLoginPanel';
import { ReaderNamePrompt } from '@/app/_components/blog/ReaderNamePrompt';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/config';
import { COMMENTS_PAGE_SIZE, type CommentsPage } from '@/lib/comments';
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
    toggle,
}: {
    comment: CommentDTO;
    locale: Locale;
    canDelete: boolean;
    onRemove: () => void;
    onReply?: () => void;
    /** The fold control, when this message has answers. Sits next to "reply"
     * rather than in a row of its own: both act on the same message. */
    toggle?: ReactNode;
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
                {(onReply || toggle) && (
                    <div className="-ml-3 mt-2 flex flex-wrap items-center gap-1">
                        {onReply && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full text-muted-foreground hover:text-primary"
                                onClick={onReply}
                            >
                                <Reply className="mr-1.5 h-4 w-4" />
                                {t('reply')}
                            </Button>
                        )}
                        {toggle}
                    </div>
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
    /** Ids whose branch the reader folded away by hand. */
    collapsed: Set<string>;
    /** Ids whose branch is being fetched right now. */
    expanding: Set<string>;
    replyBody: string;
    submitting: boolean;
    onReply: (id: string) => void;
    onToggle: (id: string) => void;
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
    const loaded = countAll(comment.replies);
    // A branch is shown when it is loaded whole and nobody folded it. Two
    // different reasons to be hidden, one control to undo either.
    const open =
        loaded >= comment.replyCount && !context.collapsed.has(comment.id);
    const busy = context.expanding.has(comment.id);

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
                toggle={
                    comment.replyCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-muted-foreground hover:text-primary"
                            aria-expanded={open}
                            disabled={busy}
                            onClick={() => context.onToggle(comment.id)}
                        >
                            {open ? (
                                <ChevronDown className="mr-1.5 h-4 w-4" />
                            ) : (
                                <ChevronRight className="mr-1.5 h-4 w-4" />
                            )}
                            {busy
                                ? t('loadingReplies')
                                : open
                                  ? t('hideReplies')
                                  : t('showReplies', {
                                        count: comment.replyCount,
                                    })}
                        </Button>
                    )
                }
            />
            {((open && comment.replies.length > 0) || composerOpen) && (
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
                    {open &&
                        comment.replies.map(reply => (
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
    let changed = false;
    // The array that comes back is the same one when nothing in this subtree
    // moved. That identity is how each level learns whether the message landed
    // underneath it, and therefore whether its own `replyCount` has to grow: a
    // count left behind would offer to load answers already on screen.
    const next = nodes.map(node => {
        if (node.id === created.parentId) {
            changed = true;
            return {
                ...node,
                replyCount: node.replyCount + 1,
                replies: [...node.replies, created],
            };
        }
        const replies = insertReply(node.replies, created);
        if (replies === node.replies) return node;
        changed = true;
        return { ...node, replyCount: node.replyCount + 1, replies };
    });
    return changed ? next : nodes;
}

/**
 * Replaces a branch with the one just fetched for it.
 *
 * `replyCount` is recomputed rather than trusted: the fetch is the fresher of
 * the two, and a thread that grew since the page was rendered would otherwise
 * keep offering to load answers that are already there.
 */
function graftReplies(
    nodes: CommentDTO[],
    id: string,
    replies: CommentDTO[]
): CommentDTO[] {
    return nodes.map(node =>
        node.id === id
            ? { ...node, replyCount: countAll(replies), replies }
            : { ...node, replies: graftReplies(node.replies, id, replies) }
    );
}

/**
 * Drops a message wherever it sits. Its answers go with it, which is what the
 * database does too: the foreign key cascades down the branch.
 *
 * `removed` is the size of what disappears, the message included. It is passed
 * in rather than measured here because part of that branch may never have been
 * loaded, and every ancestor has to shed exactly that many descendants.
 */
function removeFromTree(
    nodes: CommentDTO[],
    id: string,
    removed: number
): CommentDTO[] {
    if (nodes.some(node => node.id === id)) {
        return nodes.filter(node => node.id !== id);
    }
    let changed = false;
    const next = nodes.map(node => {
        const replies = removeFromTree(node.replies, id, removed);
        if (replies === node.replies) return node;
        changed = true;
        return {
            ...node,
            replyCount: Math.max(0, node.replyCount - removed),
            replies,
        };
    });
    return changed ? next : nodes;
}

/** Every message in the tree, at any depth. */
function countAll(nodes: CommentDTO[]): number {
    return nodes.reduce((sum, node) => sum + 1 + countAll(node.replies), 0);
}

/** The message with this id, wherever it sits, or null. */
function findNode(nodes: CommentDTO[], id: string): CommentDTO | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.replies, id);
        if (found) return found;
    }
    return null;
}

/**
 * The discussion under an article: the way to add a message first, then the
 * threads, newest first, each with its answers nested underneath.
 */
export function ArticleComments({
    articleId,
    initialComments,
    locale,
    returnTo,
}: {
    articleId: string;
    initialComments: CommentsPage;
    locale: Locale;
    returnTo: string;
}) {
    const t = useTranslations('comments');
    const { reader, loading: sessionLoading, promptLogin } = useReaderSession();
    const [items, setItems] = useState<CommentDTO[]>(initialComments.items);
    // The two counts describe the whole discussion, `items` only the part
    // currently on screen. They are kept by hand from here on: re-reading the
    // page after every write would cost a round trip to learn what the write
    // already told us.
    const [totalRoots, setTotalRoots] = useState(initialComments.totalRoots);
    const [totalComments, setTotalComments] = useState(
        initialComments.totalComments
    );
    const [body, setBody] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [expanding, setExpanding] = useState<Set<string>>(new Set());
    // Root threads already read from the API, which is what the next page is
    // offset by. Not `items.length`: a thread this reader just wrote sits at
    // the top locally and also exists server-side, and counting it here would
    // skip one.
    const [fetched, setFetched] = useState(initialComments.items.length);
    const [loadingMore, setLoadingMore] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setTotalRoots(prev => prev + 1);
            setTotalComments(prev => prev + 1);
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
            setTotalComments(prev => prev + 1);
            setReplyBody('');
            setReplyTo(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async (id: string) => {
        // Counted before the write: the branch goes with the message, and
        // `replyCount` is the only honest size of it when part of that branch
        // was never loaded.
        const node = findNode(items, id);
        const removed = node ? 1 + node.replyCount : 1;
        const wasRoot = items.some(root => root.id === id);
        try {
            await ReaderApi.removeComment(id);
            setItems(prev => removeFromTree(prev, id, removed));
            setTotalComments(prev => Math.max(0, prev - removed));
            if (wasRoot) setTotalRoots(prev => Math.max(0, prev - 1));
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        }
    };

    /**
     * Fetches a branch that was left behind, and puts it in place. Returns once
     * the tree holds it, so a caller can rely on the branch being there.
     */
    const expand = async (id: string) => {
        const node = findNode(items, id);
        if (!node || countAll(node.replies) >= node.replyCount) return;
        setExpanding(prev => new Set(prev).add(id));
        try {
            const replies = await ReaderApi.findReplies(id);
            setItems(prev => graftReplies(prev, id, replies));
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        } finally {
            setExpanding(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    /** One control, two reasons a branch can be hidden: folded, or not loaded. */
    const toggle = async (id: string) => {
        if (collapsed.has(id)) {
            setCollapsed(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            return;
        }
        const node = findNode(items, id);
        if (node && countAll(node.replies) < node.replyCount) {
            await expand(id);
            return;
        }
        setCollapsed(prev => new Set(prev).add(id));
    };

    const openReply = async (id: string) => {
        if (!reader || reader.needsName) {
            promptLogin();
            return;
        }
        setReplyBody('');
        setReplyTo(id);
        // Answering a thread whose branch is hidden shows it first. Otherwise
        // the reply is written into a conversation the writer cannot read, and
        // lands in a branch that is not on screen.
        setCollapsed(prev => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        await expand(id);
    };

    const loadMore = async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await ReaderApi.findComments(articleId, {
                skip: fetched,
                take: COMMENTS_PAGE_SIZE,
            });
            setItems(prev => [...prev, ...page.items]);
            setFetched(prev => prev + page.items.length);
            setTotalRoots(page.totalRoots);
            setTotalComments(page.totalComments);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        } finally {
            setLoadingMore(false);
        }
    };

    const context: ThreadContext = {
        locale,
        readerId: reader?.id ?? null,
        replyTo,
        replyBody,
        submitting,
        collapsed,
        expanding,
        onReply: openReply,
        onToggle: toggle,
        onRemove: remove,
        onReplyBodyChange: setReplyBody,
        onSubmitReply: submitReply,
        onCancelReply: () => setReplyTo(null),
    };

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
                {t('commentCount', { count: totalRoots })}
                {' · '}
                {t('replyCount', { count: totalComments - totalRoots })}
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

            {items.length === 0 ? (
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

            {items.length < totalRoots && (
                <div className="mt-8 flex justify-center">
                    <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={loadingMore}
                        onClick={loadMore}
                    >
                        {loadingMore ? t('loadingReplies') : t('loadMore')}
                    </Button>
                </div>
            )}
        </div>
    );
}
