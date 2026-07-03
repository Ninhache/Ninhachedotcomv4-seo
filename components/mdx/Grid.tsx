import type { ReactNode } from 'react';

/** Literal Tailwind classes per column count - Tailwind can't build classes
 * from a runtime variable, so `cols` is mapped through this lookup. */
const COLS_CLASS = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
} as const;

/**
 * MDX `<Grid>` - a responsive layout for arbitrary children (often `<Card>`s):
 * 1 column on mobile, `cols` columns from `sm` up. Also exported as `<Cols>`.
 * Presentational.
 */
export function Grid({
    cols = 2,
    children,
}: {
    cols?: 2 | 3 | 4;
    children?: ReactNode;
}) {
    return (
        <div className={`not-prose my-6 grid gap-4 ${COLS_CLASS[cols]}`}>
            {children}
        </div>
    );
}

export const Cols = Grid;
