'use client';

import { Eye } from 'lucide-react';
import { type ReactNode, useState } from 'react';

/**
 * Inline MDX `<Reveal>` - a "devine d'abord" spoiler for a shock stat or
 * punchline mid-sentence: `le score : <Reveal>175901/175901</Reveal>`. Before
 * click it's a discreet cyan pill (eye icon + `label`, default "Révéler") that
 * leaks neither the value nor its length; clicking swaps in the answer in a
 * cyan highlight so it reads as the payoff. `label` overrides the pill text.
 */
export function Reveal({
    children,
    label = 'Révéler',
}: {
    children?: ReactNode;
    label?: string;
}) {
    const [revealed, setRevealed] = useState(false);

    if (revealed) {
        return (
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-semibold text-foreground [box-decoration-break:clone]">
                {children}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 align-middle text-primary text-sm leading-none transition-colors hover:bg-primary/20"
        >
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="translate-y-px">{label}</span>
        </button>
    );
}
