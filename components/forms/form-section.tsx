import type React from 'react';
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
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className="space-y-4">
            <SectionHeading
                icon={icon}
                title={title}
                description={description}
            />
            <div
                className={cn(
                    'rounded-lg border bg-muted/30 p-4 space-y-4',
                    className
                )}
            >
                {children}
            </div>
        </section>
    );
}
