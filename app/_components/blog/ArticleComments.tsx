'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/config';
import { type CommentDTO, ReaderApi } from '@/lib/reader/reader.api';

// Mirrors COMMENT_MAX_LENGTH on the API, which is the authority: this only
// spares the reader a round-trip to discover it.
const MAX_LENGTH = 2000;

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
 * The comment thread under an article: a flat list, newest first, plus a form
 * for whoever is signed in.
 *
 * Bodies are plain text end to end. They are stored as typed and rendered by
 * React, so they are escaped; `whitespace-pre-wrap` is the entire formatting
 * budget. No Markdown, no HTML: that is the XSS surface this refuses to open.
 */
export function ArticleComments({
    articleId,
    locale,
}: {
    articleId: string;
    locale: Locale;
}) {
    const t = useTranslations('comments');
    const { reader } = useReaderSession();
    const [items, setItems] = useState<CommentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState('');
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

    const remove = async (id: string) => {
        try {
            await ReaderApi.removeComment(id);
            setItems(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : t('error'));
        }
    };

    return (
        <div className="space-y-6">
            {reader && (
                <div className="space-y-2">
                    <label htmlFor="comment-body" className="sr-only">
                        {t('placeholder')}
                    </label>
                    <textarea
                        id="comment-body"
                        value={body}
                        maxLength={MAX_LENGTH}
                        rows={4}
                        onChange={e => setBody(e.target.value)}
                        placeholder={t('placeholder')}
                        className="w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                    />
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-muted-foreground">
                            {body.length}/{MAX_LENGTH}
                        </p>
                        <Button
                            size="sm"
                            disabled={!body.trim() || submitting}
                            onClick={submit}
                        >
                            {t('submit')}
                        </Button>
                    </div>
                </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {loading ? (
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('empty')}</p>
            ) : (
                <ul className="space-y-5">
                    {items.map(comment => (
                        <li
                            key={comment.id}
                            className="flex gap-3 rounded-xl border border-border bg-card p-4"
                        >
                            {comment.reader.avatarUrl ? (
                                <img
                                    src={comment.reader.avatarUrl}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {comment.reader.displayName}
                                    </span>
                                    <time
                                        dateTime={comment.createdAt}
                                        className="text-xs text-muted-foreground"
                                    >
                                        {formatDate(comment.createdAt, locale)}
                                    </time>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                    {comment.body}
                                </p>
                            </div>
                            {reader?.id === comment.reader.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('delete')}
                                    onClick={() => remove(comment.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
