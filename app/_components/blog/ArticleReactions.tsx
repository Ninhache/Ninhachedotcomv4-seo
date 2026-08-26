'use client';

import { Heart, Laugh, Lightbulb, ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
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

/** Query parameter carrying a reaction across the OAuth round-trip. */
const PENDING_PARAM = 'react';

/**
 * Reads the reaction a visitor pressed before signing in, and removes it from
 * the URL right away so a later refresh does not toggle it a second time.
 */
function takePendingReaction(): ReactionKind | null {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(PENDING_PARAM);
    if (!value) return null;
    url.searchParams.delete(PENDING_PARAM);
    window.history.replaceState(
        null,
        '',
        `${url.pathname}${url.search}${url.hash}`
    );
    return (REACTION_KINDS as readonly string[]).includes(value)
        ? (value as ReactionKind)
        : null;
}

/**
 * The four reactions under an article. Counts are public; recording one needs a
 * reader session, because an anonymous counter is a raid waiting to happen.
 *
 * Pressing a reaction while signed out is not forbidden, it opens the sign-in
 * block and carries the intent along: the visitor comes back to the article with
 * their reaction already registered.
 *
 * Loaded client-side so a reaction never has to invalidate the article's ISR
 * cache.
 */
export function ArticleReactions({ articleId }: { articleId: string }) {
    const t = useTranslations('comments');
    const { reader, loading: sessionLoading, promptLogin } = useReaderSession();
    const [summary, setSummary] = useState<ReactionSummary>(EMPTY);
    const [pending, setPending] = useState<ReactionKind | null>(null);

    useEffect(() => {
        // Waiting for the session avoids both a double fetch and consuming the
        // pending reaction before we know who is asking.
        if (sessionLoading) return;
        let cancelled = false;
        (async () => {
            let next = await ReaderApi.findReactions(articleId).catch(
                () => null
            );
            const replay = takePendingReaction();
            if (next && reader && replay && !next.mine.includes(replay)) {
                next = await ReaderApi.toggleReaction(articleId, replay).catch(
                    () => next
                );
            }
            if (next && !cancelled) setSummary(next);
        })();
        return () => {
            cancelled = true;
        };
        // `reader` is a dependency on purpose: signing in or out changes which
        // reactions come back as "mine".
    }, [articleId, reader, sessionLoading]);

    const toggle = async (kind: ReactionKind) => {
        if (!reader) {
            promptLogin(kind);
            return;
        }
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

    const total = REACTION_KINDS.reduce(
        (sum, kind) => sum + (summary.counts[kind] ?? 0),
        0
    );

    return (
        <div className="text-center">
            <h2
                className={cn(
                    'text-2xl text-foreground',
                    ralewaySemiBold.className
                )}
            >
                {t('reactTitle')}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
                {t('reactCount', { count: total })}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-8 sm:gap-x-16">
                {REACTION_KINDS.map(kind => {
                    const Icon = ICONS[kind];
                    const mine = summary.mine.includes(kind);
                    return (
                        <button
                            key={kind}
                            type="button"
                            disabled={pending === kind}
                            onClick={() => toggle(kind)}
                            aria-pressed={mine}
                            className="group flex w-20 flex-col items-center gap-2"
                        >
                            <span
                                className={cn(
                                    'flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 group-hover:-translate-y-1',
                                    mine
                                        ? 'bg-primary/15 text-primary'
                                        : 'bg-card text-muted-foreground group-hover:text-foreground'
                                )}
                            >
                                <Icon className="h-7 w-7" />
                            </span>
                            <span
                                className={cn(
                                    'text-base tabular-nums',
                                    mine ? 'text-primary' : 'text-foreground'
                                )}
                            >
                                {summary.counts[kind] ?? 0}
                            </span>
                            <span className="text-muted-foreground text-xs">
                                {t(`reactions.${kind}`)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
