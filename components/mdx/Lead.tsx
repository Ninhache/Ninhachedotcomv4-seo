import type { ReactNode } from 'react';

/**
 * MDX `<Lead>` - the intro paragraph at the top of an article. Larger and
 * airier than body text, with softened color so it reads as a lede rather
 * than a regular paragraph. `not-prose` so `.prose` sizing doesn't apply.
 */
export function Lead({ children }: { children?: ReactNode }) {
    return (
        <p className="not-prose mt-0 mb-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {children}
        </p>
    );
}
