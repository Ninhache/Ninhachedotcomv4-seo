import type { ReactNode } from 'react';

/**
 * MDX `<Lead>` - the intro paragraph at the top of an article. Larger and
 * airier than body text, with softened color so it reads as a lede rather
 * than a regular paragraph. `not-prose` so `.prose` sizing doesn't apply.
 *
 * Renders a `<div>` (not a `<p>`): when the Lead's MDX content sits on its own
 * lines, the markdown wraps it in a `<p>`, and a `<p>` inside a `<p>` is invalid
 * HTML (hydration error). `[&>p]:m-0` flattens that inner paragraph's margins so
 * it still reads as one lede whether the content is inline or block.
 */
export function Lead({ children }: { children?: ReactNode }) {
    return (
        <div className="not-prose mt-0 mb-6 text-lg leading-relaxed text-muted-foreground sm:text-xl [&>p]:m-0">
            {children}
        </div>
    );
}
