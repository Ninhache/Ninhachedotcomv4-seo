'use client';

import { Heart, Laugh, Lightbulb, ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import {
    REACTION_KINDS,
    type ReactionKind,
    type ReactionSummary,
    ReaderApi,
} from '@/lib/reader/reader.api';
import { cn } from '@/lib/utils';

const ICONS = {
    like: ThumbsUp,
    love: Heart,
    insightful: Lightbulb,
    funny: Laugh,
} as const;

const EMPTY: ReactionSummary = {
    counts: { like: 0, love: 0, insightful: 0, funny: 0 },
    mine: [],
};

/**
 * The four reactions under an article. Counts are public; reacting requires
 * being signed in, same as commenting, because an anonymous counter is a raid
 * waiting to happen.
 *
 * Loaded client-side so a reaction never has to invalidate the article's ISR
 * cache.
 */
export function ArticleReactions({ articleId }: { articleId: string }) {
    const t = useTranslations('comments');
    const { reader } = useReaderSession();
    const [summary, setSummary] = useState<ReactionSummary>(EMPTY);
    const [pending, setPending] = useState<ReactionKind | null>(null);

    useEffect(() => {
        let cancelled = false;
        ReaderApi.findReactions(articleId)
            .then(next => {
                if (!cancelled) setSummary(next);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
        // `reader` is a dependency on purpose: signing in or out changes which
        // reactions come back as "mine".
    }, [articleId, reader]);

    const toggle = async (kind: ReactionKind) => {
        if (!reader) return;
        setPending(kind);
        try {
            setSummary(await ReaderApi.toggleReaction(articleId, kind));
        } catch {
            // Leave the previous counts in place: a failed toggle should not
            // invent a number.
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {REACTION_KINDS.map(kind => {
                const Icon = ICONS[kind];
                const mine = summary.mine.includes(kind);
                return (
                    <button
                        key={kind}
                        type="button"
                        disabled={!reader || pending === kind}
                        onClick={() => toggle(kind)}
                        aria-pressed={mine}
                        title={
                            reader ? t(`reactions.${kind}`) : t('signInHint')
                        }
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors',
                            mine
                                ? 'border-primary/40 text-primary'
                                : 'text-muted-foreground',
                            reader
                                ? 'hover:border-primary/40 hover:text-foreground'
                                : 'cursor-not-allowed opacity-70'
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="sr-only">
                            {t(`reactions.${kind}`)}
                        </span>
                        <span aria-hidden>{summary.counts[kind] ?? 0}</span>
                    </button>
                );
            })}
        </div>
    );
}
