'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

/**
 * Inline MDX `<Reveal>` - hides `children` behind a blur until clicked, for
 * "devine d'abord" moments mid-sentence (a shock stat, a punchline):
 * `le score final : <Reveal>175901/175901</Reveal>`. Renders as a single
 * accessible `<button>` (keyboard-reachable, no separate click target) so it
 * stays inline-friendly. `label` overrides the hint shown before reveal
 * (defaults to "Cliquer pour révéler").
 */
export function Reveal({
    children,
    label,
}: {
    children?: ReactNode;
    label?: string;
}) {
    const [revealed, setRevealed] = useState(false);
    const hint = label ?? 'Cliquer pour révéler';

    if (revealed) {
        return <span>{children}</span>;
    }

    return (
        <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-label={hint}
            className="relative inline-flex cursor-pointer select-none items-center rounded align-baseline"
        >
            <span aria-hidden="true" className="blur-[6px]">
                {children}
            </span>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap rounded bg-black/40 px-1.5 font-medium text-[0.85em] text-white/80"
            >
                {hint}
            </span>
        </button>
    );
}
