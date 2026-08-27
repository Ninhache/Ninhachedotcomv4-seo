'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mirrors COMMENT_MAX_LENGTH on the API, which is the authority: this only
// spares the reader a round-trip to discover it.
export const MAX_LENGTH = 2000;

/**
 * The one text box used both for a new comment and for a reply, so the two
 * never drift apart in length limit, counter or wording.
 */
export function CommentComposer({
    id,
    value,
    placeholder,
    submitting,
    onChange,
    onSubmit,
    onCancel,
    cancelLabel,
    className,
}: {
    id: string;
    value: string;
    placeholder: string;
    submitting: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    cancelLabel?: string;
    className?: string;
}) {
    const t = useTranslations('comments');

    return (
        // No frame of its own: the text box already has a border, and wrapping
        // a bordered box in a bordered box was the double outline that made the
        // whole thread look like a stack of panels.
        <div className={cn('space-y-3', className)}>
            <label htmlFor={id} className="sr-only">
                {placeholder}
            </label>
            <textarea
                id={id}
                value={value}
                maxLength={MAX_LENGTH}
                rows={4}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
            <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground text-xs tabular-nums">
                    {value.length}/{MAX_LENGTH}
                </p>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Button
                            variant="ghost"
                            className="rounded-full text-muted-foreground"
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    <Button
                        className="rounded-full px-6"
                        disabled={!value.trim() || submitting}
                        onClick={onSubmit}
                    >
                        {t('submit')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
