import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';

/**
 * One row of a `<Specs>` list: a `label` next to its `children` value. Renders
 * as a `<div>` row (not a literal `dt`/`dd` sibling pair) holding its own
 * `<dt>`/`<dd>`, so the two-column grid can apply to the row as a whole -
 * two columns from `sm` up (`label` in a fixed-width column), stacking to one
 * column on mobile.
 */
export function Spec({
    label,
    children,
}: {
    label: string;
    children?: ReactNode;
}) {
    return (
        <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[minmax(7rem,12rem)_1fr] sm:items-baseline sm:gap-4">
            <dt
                className={`text-muted-foreground ${ralewaySemiBold.className}`}
            >
                {label}
            </dt>
            <dd className="mt-0 text-foreground">{children}</dd>
        </div>
    );
}

/**
 * MDX `<Specs>` - an aligned label -> value spec list (versions, sizes, perf
 * numbers, stack). Wrap `<Spec label>` rows inside; each row is divided from
 * the next by a cyan hairline. Presentational.
 */
export function Specs({ children }: { children?: ReactNode }) {
    return (
        <dl className="not-prose my-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {children}
        </dl>
    );
}
