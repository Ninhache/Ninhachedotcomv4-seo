'use client';

import { Check, Search, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { ArticleCategoryDTO } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Multi-select over the blog category pool. Copy of `SkillMultiSelect`
 * retargeted at `ArticleCategoryDTO`: a chip bar of the selected categories
 * plus a searchable popover of the rest. Categories are authored in the
 * Article-Categories admin, so this picker is select-only — no inline
 * creation.
 */
function getName(category: ArticleCategoryDTO, locale: string) {
    return (
        category.translations?.find(t => t.locale === locale)?.name ??
        category.translations?.[0]?.name ??
        category.id ??
        ''
    );
}

export function ArticleCategoryMultiSelect({
    value = [],
    onChange,
    options = [],
    locale = 'fr',
    placeholder = 'Rechercher une catégorie…',
    compact = true,
}: {
    value?: string[];
    onChange: (ids: string[]) => void;
    options?: ArticleCategoryDTO[];
    locale?: string;
    placeholder?: string;
    compact?: boolean;
}) {
    const safeOptions = Array.isArray(options) ? options : [];
    const safeValue = Array.isArray(value) ? value : [];

    const [query, setQuery] = React.useState('');
    const [searchOpen, setSearchOpen] = React.useState(false);

    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const commandInputRef = React.useRef<HTMLInputElement>(null);

    const selected = safeOptions.filter(o => safeValue.includes(o.id));

    const visibleOptions = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return safeOptions;
        return safeOptions.filter(opt =>
            getName(opt, locale).toLowerCase().includes(q)
        );
    }, [safeOptions, query, locale]);

    React.useEffect(() => {
        if (!searchOpen) {
            setQuery('');
            return undefined;
        }
        const raf = requestAnimationFrame(() => {
            commandInputRef.current?.focus();
            commandInputRef.current?.select();
        });
        return () => cancelAnimationFrame(raf);
    }, [searchOpen]);

    const handleToggle = (id: string) => {
        const isSel = safeValue.includes(id);
        onChange(isSel ? safeValue.filter(v => v !== id) : [...safeValue, id]);
    };

    const openSearch = () => {
        if (searchOpen) {
            commandInputRef.current?.focus();
            commandInputRef.current?.select();
            return;
        }
        setSearchOpen(true);
    };

    const onContainerKeyDown: React.KeyboardEventHandler<
        HTMLDivElement
    > = e => {
        // The popover is portaled but React still bubbles its events here; only
        // act when the bar itself is focused so typing in the search box doesn't
        // also pop the last selected chip.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openSearch();
        } else if (e.key === 'Backspace' && selected.length > 0) {
            e.preventDefault();
            onChange(safeValue.slice(0, -1));
        } else if (
            e.key.length === 1 &&
            !e.metaKey &&
            !e.altKey &&
            !e.ctrlKey
        ) {
            e.preventDefault();
            setQuery(prev => (searchOpen ? `${prev}${e.key}` : e.key));
            openSearch();
        } else if (e.key === 'Escape' && searchOpen) {
            setSearchOpen(false);
        }
    };

    return (
        <div className="space-y-2">
            <div
                role="button"
                tabIndex={0}
                onClick={openSearch}
                onKeyDown={onContainerKeyDown}
                className={cn(
                    'flex items-center gap-2 rounded-md border bg-background px-2 py-1 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none',
                    'cursor-text',
                    compact
                        ? 'min-h-10 flex-nowrap overflow-x-auto'
                        : 'flex-wrap'
                )}
            >
                {selected.length === 0 && (
                    <span className="text-sm text-muted-foreground select-none">
                        {placeholder}
                    </span>
                )}

                {selected.map(category => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            handleToggle(category.id);
                        }}
                        onKeyDown={e => e.stopPropagation()}
                        className="group inline-flex items-center rounded-full bg-muted/60 px-2 py-1 text-xs transition-colors hover:bg-muted"
                        aria-label={`Retirer ${getName(category, locale)}`}
                        title={`Retirer ${getName(category, locale)}`}
                    >
                        <span className="text-foreground/90">
                            {getName(category, locale)}
                        </span>
                        <span className="ml-1 inline-flex items-center justify-center rounded p-0.5 hover:bg-background/30">
                            <X className="h-3 w-3" />
                        </span>
                    </button>
                ))}

                <div className="flex-1" />

                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            ref={triggerRef}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 cursor-pointer"
                            aria-label="Rechercher une catégorie"
                            onClick={e => {
                                e.stopPropagation();
                                setSearchOpen(v => !v);
                            }}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-72 p-0"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* We filter by name via `visibleOptions`; cmdk's default
                            filter scores the query against each item's `value`
                            (the category id, a cuid) and would hide the wrong rows. */}
                        <Command shouldFilter={false}>
                            <CommandInput
                                ref={commandInputRef}
                                placeholder={placeholder}
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandEmpty className="p-3 text-sm">
                                Aucun résultat.
                            </CommandEmpty>
                            <CommandGroup>
                                {visibleOptions.map(opt => {
                                    const isSel = safeValue.includes(opt.id);
                                    return (
                                        <CommandItem
                                            key={opt.id}
                                            value={opt.id}
                                            className="cursor-pointer"
                                            onSelect={() =>
                                                handleToggle(opt.id)
                                            }
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    isSel
                                                        ? 'opacity-100'
                                                        : 'opacity-0'
                                                )}
                                            />
                                            <span>{getName(opt, locale)}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
