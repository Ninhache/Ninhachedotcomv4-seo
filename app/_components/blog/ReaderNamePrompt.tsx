'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
import { Button } from '@/components/ui/button';
import {
    DISPLAY_NAME_MAX,
    DISPLAY_NAME_MIN,
    PROVIDER_LABEL,
} from '@/lib/reader/reader.api';
import { cn } from '@/lib/utils';

/**
 * The step between signing in and publishing anything, shown where the comment
 * form would be as soon as the session says no name has been chosen yet.
 *
 * It exists because providers hand back a legal first and last name. Without
 * this step, someone's first comment would publish their civil identity before
 * they realised it was going to, and a comment cannot be unpublished from the
 * memory of whoever already read it. So there is no "later" button: skipping
 * would restore exactly the problem this prevents. The API refuses writes on
 * the same condition, so the rule does not depend on this component rendering.
 *
 * Inline panel rather than a modal, like `ReaderLoginPanel`: the blog theme
 * tokens are set as an inline style on a layout div, and anything portalled to
 * `document.body` would render outside them.
 */
export function ReaderNamePrompt({ className }: { className?: string }) {
    const t = useTranslations('account.namePrompt');
    const { reader, updateName, prompting, dismissPrompt } = useReaderSession();
    const [value, setValue] = useState(reader?.suggestedName ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // Pressing a reaction lands here rather than on the sign-in panel: the
    // person is signed in, what is missing is the name. Same highlight and same
    // fade as the sign-in panel so the two feel like one step of a sequence.
    useEffect(() => {
        if (!prompting) return;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timer = window.setTimeout(dismissPrompt, 2600);
        return () => window.clearTimeout(timer);
    }, [prompting, dismissPrompt]);

    if (!reader) return null;

    const submit = async () => {
        const trimmed = value.trim();
        if (trimmed.length < DISPLAY_NAME_MIN || saving) return;
        setSaving(true);
        setError(null);
        const failure = await updateName(trimmed);
        setSaving(false);
        if (failure) setError(failure);
        else dismissPrompt();
    };

    return (
        <div
            ref={ref}
            className={cn(
                'rounded-2xl border border-border bg-card p-5 transition-shadow duration-500 sm:p-6',
                prompting && 'ring-2 ring-primary/50',
                className
            )}
        >
            <h3
                className={cn(
                    'text-foreground text-xl',
                    ralewaySemiBold.className
                )}
            >
                {t('title')}
            </h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t('intro', { provider: PROVIDER_LABEL[reader.provider] })}
            </p>

            <label
                htmlFor="reader-display-name"
                className="mt-6 block text-foreground text-sm"
            >
                {t('label')}
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                    id="reader-display-name"
                    value={value}
                    maxLength={DISPLAY_NAME_MAX}
                    autoComplete="off"
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') submit();
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
                <Button
                    className="rounded-full px-6"
                    disabled={value.trim().length < DISPLAY_NAME_MIN || saving}
                    onClick={submit}
                >
                    {saving ? t('saving') : t('submit')}
                </Button>
            </div>
            <p className="mt-2 text-muted-foreground text-xs">{t('hint')}</p>
            {error && <p className="mt-3 text-destructive text-sm">{error}</p>}
        </div>
    );
}
