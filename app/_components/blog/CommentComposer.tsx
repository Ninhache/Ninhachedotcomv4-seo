'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// Mirrors COMMENT_MAX_LENGTH on the API, which is the authority: this only
// spares the reader a round-trip to discover it.
export const MAX_LENGTH = 2000;

/**
 * How near the ceiling the reader has to be before the counter appears.
 *
 * A box that reads 0/2000 from the first frame is a number nobody is counting,
 * and it sits there competing with the button for the same row. The limit is
 * only information once it is within reach; until then the row says something
 * useful instead.
 */
const COUNTER_VISIBLE_FROM = 200;

/** Where that same number stops being a fact and becomes a warning. */
const COUNTER_WARNS_FROM = 50;

/**
 * The one text box used both for a new comment and for a reply, so the two
 * never drift apart in length limit, counter or wording.
 *
 * Counter and controls live *inside* the box rather than under it. Floating
 * them below left the eye with three separate objects and no way to tell that
 * the button belonged to the field; enclosed, the whole thing reads as one
 * control, and the row under the text has somewhere to put the keyboard hint.
 */
export function CommentComposer({
    id,
    value,
    placeholder,
    submitting,
    autoFocus,
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
    /** Set on a reply box: it was opened by a click that meant "write now". */
    autoFocus?: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    cancelLabel?: string;
    className?: string;
}) {
    const t = useTranslations('comments');
    const remaining = MAX_LENGTH - value.length;
    const ready = value.trim().length > 0 && !submitting;

    /**
     * The two shortcuts a text box owes anyone who types for a living: send
     * without reaching for the mouse, and back out of a reply with one key.
     * Enter alone stays a line break, which is the whole point of a textarea.
     */
    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Escape' && onCancel) {
            event.preventDefault();
            onCancel();
            return;
        }
        if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        if (ready) onSubmit();
    };

    return (
        <Field className={className}>
            <FieldLabel htmlFor={id} className="sr-only">
                {placeholder}
            </FieldLabel>
            <InputGroup>
                <InputGroupTextarea
                    id={id}
                    value={value}
                    maxLength={MAX_LENGTH}
                    autoFocus={autoFocus}
                    disabled={submitting}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    // The box grows with what is typed, so `rows` would not
                    // survive the first keystroke anyway; the minimum is what
                    // decides how much of an invitation an empty box is. Four
                    // lines of room reads as "write something", one line reads
                    // as "leave a note". Kept at reading size on every width:
                    // the field ships a smaller face from `md` up, which is
                    // right for a form and wrong for prose. The ceiling keeps a
                    // long comment from pushing its own buttons off the screen:
                    // past it the box scrolls instead of growing.
                    className="max-h-64 min-h-24 md:text-base"
                />
                <InputGroupAddon align="block-end" className="gap-3">
                    {remaining <= COUNTER_VISIBLE_FROM ? (
                        <InputGroupText
                            className={cn(
                                'tabular-nums',
                                remaining <= COUNTER_WARNS_FROM &&
                                    'text-destructive'
                            )}
                        >
                            {value.length}/{MAX_LENGTH}
                        </InputGroupText>
                    ) : (
                        <InputGroupText className="hidden sm:flex">
                            {t('submitHint')}
                        </InputGroupText>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {onCancel && (
                            <InputGroupButton
                                size="sm"
                                variant="ghost"
                                className="rounded-full"
                                disabled={submitting}
                                onClick={onCancel}
                            >
                                {cancelLabel}
                            </InputGroupButton>
                        )}
                        <InputGroupButton
                            size="sm"
                            variant="default"
                            className="rounded-full px-4"
                            disabled={!ready}
                            onClick={onSubmit}
                        >
                            {submitting && <Spinner />}
                            {t('submit')}
                        </InputGroupButton>
                    </div>
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
}
