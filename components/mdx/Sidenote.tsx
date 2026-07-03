import type { ReactNode } from 'react';

/**
 * Fallback for `<Sidenote>`. Normally `remarkSidenotes` (lib/markdown/) rewrites
 * every `<Sidenote>` into a numbered footnote reference (with the note moved to
 * the bottom of its section) before this component is ever reached. This renders
 * only if that transform was skipped, degrading to a small inline parenthetical
 * instead of erroring.
 */
export function Sidenote({ children }: { children?: ReactNode }) {
    return <span className="text-muted-foreground text-sm"> ({children})</span>;
}
