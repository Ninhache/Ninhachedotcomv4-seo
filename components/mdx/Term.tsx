'use client';

import { type ReactNode, useId } from 'react';
import { CYAN } from './tokens';

/**
 * Inline MDX `<Term>`: a glossary term (ΔE, GiST, D65, LTO, AST, ISR...) with a
 * styled definition tooltip on hover/focus. Replaces the native `<abbr title>`
 * tooltip (ugly, slow, unstylable) with a DA popover: dotted cyan underline as
 * the affordance, a rounded card in the popover surface that fades in above the
 * term. Keyboard-focusable and linked via `aria-describedby` for screen readers.
 */
export function Term({ children, def }: { children?: ReactNode; def: string }) {
    const id = useId();
    return (
        <span className="group relative inline-block">
            <abbr
                tabIndex={0}
                aria-describedby={id}
                className="cursor-help rounded-sm no-underline outline-none"
                style={{
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: `color-mix(in srgb, ${CYAN} 60%, transparent)`,
                    textUnderlineOffset: '3px',
                }}
            >
                {children}
            </abbr>
            <span
                role="tooltip"
                id={id}
                className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2 translate-y-1 rounded-lg border border-border bg-popover px-3 py-1.5 text-left text-popover-foreground text-sm normal-case leading-snug opacity-0 shadow-xl transition duration-150 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
            >
                {def}
            </span>
        </span>
    );
}
