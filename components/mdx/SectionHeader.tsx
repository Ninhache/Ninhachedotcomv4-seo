import type { ReactNode } from 'react';
import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts';

/**
 * MDX `<Center>` - a generic centering wrapper for a heading, an image, or a
 * short line that needs to break out of the left-aligned prose flow.
 */
export function Center({ children }: { children?: ReactNode }) {
    return <div className="my-6 text-center [&_img]:mx-auto">{children}</div>;
}

/**
 * MDX `<SectionHeader>` - a centered section header, DA style: an optional
 * uppercase kicker above the title, and an optional muted subtitle below.
 */
export function SectionHeader({
    kicker,
    title,
    subtitle,
}: {
    kicker?: string;
    title: string;
    subtitle?: string;
}) {
    return (
        <header className="not-prose my-10 text-center">
            {kicker ? (
                <p
                    className={`mb-2 text-sm uppercase tracking-wide text-primary ${ralewaySemiBold.className}`}
                >
                    {kicker}
                </p>
            ) : null}
            <p
                className={`text-3xl sm:text-4xl text-foreground ${proximaNovaBold.className}`}
            >
                {title}
            </p>
            {subtitle ? (
                <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                    {subtitle}
                </p>
            ) : null}
        </header>
    );
}
