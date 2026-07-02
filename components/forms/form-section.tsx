'use client';

import { ChevronDown } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Heading for a form section: an icon, a title, and an optional description.
 * Shared so every admin form labels its sections the same way (extracted from
 * the projects form, which was the original/reference layout).
 */
export function SectionHeading({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-center gap-2 pb-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
                <h3 className="text-sm font-semibold leading-none">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * A titled "card" block for admin forms: a {@link SectionHeading} above a
 * bordered, muted-background body. This is the single source of truth for the
 * card visual used across every admin form (companies, missions, skills,
 * education, contacts, projects, profile) so sections look identical everywhere.
 */
export function FormSection({
    icon,
    title,
    description,
    children,
    className,
    collapsible = false,
    defaultOpen = true,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    // When true, the header becomes a toggle that collapses the card body.
    // The body stays MOUNTED (hidden via CSS) so form field state is preserved.
    collapsible?: boolean;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const heading = (
        <SectionHeading icon={icon} title={title} description={description} />
    );
    return (
        <section className="space-y-4">
            {collapsible ? (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-2 text-left"
                >
                    {heading}
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            !open && '-rotate-90'
                        )}
                    />
                </button>
            ) : (
                heading
            )}
            <div
                className={cn(
                    'rounded-lg border bg-muted/30 p-4 space-y-4',
                    collapsible && !open && 'hidden',
                    className
                )}
            >
                {children}
            </div>
        </section>
    );
}
