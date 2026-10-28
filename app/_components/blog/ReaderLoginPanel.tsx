'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import {
    loginUrl,
    PROVIDER_LABEL,
    READER_PROVIDERS,
} from '@/lib/reader/reader.api';
import { cn } from '@/lib/utils';
import { Link } from '@/navigation';

/**
 * The way in, shown where a signed-out visitor would otherwise find the comment
 * form.
 *
 * The buttons are plain links, not fetches: an OAuth consent screen needs a
 * top-level navigation, and the API is the one that must end up holding the
 * cookie, so the browser has to go there itself. Three buttons rather than one
 * because the API has no login page of its own to choose a provider on.
 *
 * When a reaction is what triggered the prompt, it rides along in `returnTo` and
 * the reactions replay it on the way back, so pressing a reaction while signed
 * out costs one click, not two.
 */
export function ReaderLoginPanel({ returnTo }: { returnTo: string }) {
    const t = useTranslations('comments');
    const tLegal = useTranslations('legal');
    const { prompting, pendingReaction, dismissPrompt } = useReaderSession();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!prompting) return;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // The highlight is an invitation, not a state: it fades on its own so a
        // visitor who came back later does not find the block still shouting.
        const timer = window.setTimeout(dismissPrompt, 2600);
        return () => window.clearTimeout(timer);
    }, [prompting, dismissPrompt]);

    const target = pendingReaction
        ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}react=${pendingReaction}`
        : returnTo;

    return (
        <div
            ref={ref}
            className={cn(
                'rounded-2xl border border-border bg-card/40 px-6 py-10 text-center transition-shadow duration-500',
                prompting && 'ring-2 ring-primary/50'
            )}
        >
            <p className="text-muted-foreground text-sm">
                {t('signInRequired')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
                {READER_PROVIDERS.map(provider => (
                    <a
                        key={provider}
                        href={loginUrl(provider, target)}
                        className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-2.5 text-foreground text-sm transition-colors hover:border-primary/50 hover:text-primary"
                    >
                        {PROVIDER_LABEL[provider]}
                    </a>
                ))}
            </div>
            <p className="mx-auto mt-6 max-w-md text-muted-foreground text-xs leading-relaxed">
                {tLegal.rich('consent', {
                    cgu: chunks => (
                        <Link
                            href="/legal/cgu"
                            className="underline underline-offset-2 hover:text-primary"
                        >
                            {chunks}
                        </Link>
                    ),
                    privacy: chunks => (
                        <Link
                            href="/legal/confidentialite"
                            className="underline underline-offset-2 hover:text-primary"
                        >
                            {chunks}
                        </Link>
                    ),
                })}
            </p>
        </div>
    );
}
