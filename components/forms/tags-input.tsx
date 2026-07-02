'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

/**
 * Controlled chip/tag input. Enter or comma commits the current text as a new
 * tag (trimmed, deduplicated, empty ignored); Backspace on an empty field
 * removes the last chip. Simpler sibling of {@link ArticleCategoryMultiSelect}
 * — no popover/search, just free-form text — used for the article's blog tags.
 */
export function TagsInput({
    value = [],
    onChange,
    placeholder = 'Ajouter un tag…',
}: {
    value?: string[];
    onChange: (v: string[]) => void;
    placeholder?: string;
}) {
    const [draft, setDraft] = useState('');

    const commit = () => {
        const tag = draft.trim();
        setDraft('');
        if (!tag || value.includes(tag)) return;
        onChange([...value, tag]);
    };

    const removeAt = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            e.preventDefault();
            removeAt(value.length - 1);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            {value.map((tag, index) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeAt(index)}
                        aria-label={`Retirer ${tag}`}
                        className="rounded-full hover:bg-background/40"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            <Input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={value.length === 0 ? placeholder : ''}
                aria-label="Ajouter un tag"
                className="h-7 min-w-24 flex-1 border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
            />
        </div>
    );
}
