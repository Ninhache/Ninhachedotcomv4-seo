'use client';

import { useTranslations } from 'next-intl';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { Button } from '@/components/ui/button';
import { loginUrl, READER_PROVIDERS } from '@/lib/reader/reader.api';

const PROVIDER_LABEL = {
    google: 'Google',
    github: 'GitHub',
    discord: 'Discord',
} as const;

/**
 * Who you are on the blog: either the signed-in avatar with a way out, or the
 * three ways in.
 *
 * The login buttons are plain links, not fetches. An OAuth consent screen needs
 * a top-level navigation, and the API is the one that must end up holding the
 * cookie, so the browser has to go there itself.
 */
export function ReaderIdentity({ returnTo }: { returnTo: string }) {
    const t = useTranslations('comments');
    const { reader, loading, logout } = useReaderSession();

    if (loading) return null;

    if (reader) {
        return (
            <div className="flex items-center gap-3">
                {reader.avatarUrl && (
                    <img
                        src={reader.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                )}
                <span className="text-sm text-foreground">
                    {reader.displayName}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => logout()}
                >
                    {t('logout')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
                {t('signInPrompt')}
            </span>
            {READER_PROVIDERS.map(provider => (
                <Button
                    key={provider}
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-full border-border bg-card hover:border-primary/40 hover:bg-card"
                >
                    <a href={loginUrl(provider, returnTo)}>
                        {PROVIDER_LABEL[provider]}
                    </a>
                </Button>
            ))}
        </div>
    );
}
