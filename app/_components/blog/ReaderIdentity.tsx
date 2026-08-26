'use client';

import { useTranslations } from 'next-intl';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { Button } from '@/components/ui/button';

/**
 * Who you are on the blog, shown next to the comments heading once signed in.
 *
 * Signed out it renders nothing: the way in is `ReaderLoginPanel`, which sits
 * where the comment form would be, so there is exactly one sign-in call to
 * action on the page instead of two competing ones.
 */
export function ReaderIdentity() {
    const t = useTranslations('comments');
    const { reader, loading, logout } = useReaderSession();

    if (loading || !reader) return null;

    return (
        <div className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-2">
            {reader.avatarUrl && (
                <img
                    src={reader.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                />
            )}
            <span className="text-foreground text-sm">
                {reader.displayName}
            </span>
            <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => logout()}
            >
                {t('logout')}
            </Button>
        </div>
    );
}
