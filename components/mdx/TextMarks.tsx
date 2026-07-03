import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';
import { BLUE, CYAN, TONE, type Tone, toneSurface } from './tokens';

// `<Term>` moved to its own client file (components/mdx/Term.tsx) for its styled
// hover/focus tooltip.

/**
 * Inline MDX `<Badge>`: a small semantic pill for statuses called out in
 * prose (`serveur`/`client`, `resolu`/`a revoir`, `risque`...), e.g.
 * `<Badge tone="good">resolu</Badge>`. Colored via `toneSurface(tone)`
 * (tinted background + border + accent text) - the same palette
 * `<Compare>`'s label chips use. `tone` defaults to `neutral`.
 */
export function Badge({
    children,
    tone = 'neutral',
}: {
    children?: ReactNode;
    tone?: Tone;
}) {
    const s = toneSurface(tone);
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] uppercase tracking-wide ${ralewaySemiBold.className}`}
            style={{
                color: s.accent,
                background: s.background,
                border: `1px solid ${s.borderColor}`,
            }}
        >
            {children}
        </span>
    );
}

type TokKind = 'param' | 'nav' | 'cond' | 'math';

// Fixed per-kind accents so a DSL's grammar reads consistently across an
// article: params reuse the blog's cyan, navigation the blue, cond/math get
// their own violet/amber so all four stay visually distinct at a glance.
const TOK_COLOR: Record<TokKind, string> = {
    param: CYAN,
    nav: BLUE,
    cond: '#a855f7',
    math: '#f59e0b',
};

/**
 * Inline MDX `<Tok>`: a monospace token from a small DSL, tinted by `kind` so
 * a grammar reads distinctly in prose - e.g. a tooltip DSL's `[#N]`,
 * `[$C$D#P]`, `{[COND]?a:b}`. `kind` maps to a fixed accent: `param` (cyan),
 * `nav` (blue), `cond` (violet), `math` (amber); an omitted/unknown `kind`
 * falls back to a neutral tint. Presentational.
 */
export function Tok({
    children,
    kind,
}: {
    children?: ReactNode;
    kind?: TokKind;
}) {
    const color = kind ? TOK_COLOR[kind] : TONE.neutral;
    return (
        <code
            className="rounded px-1 py-0.5 font-mono text-[0.9em]"
            style={{
                color,
                background: `color-mix(in oklch, ${color} 16%, transparent)`,
            }}
        >
            {children}
        </code>
    );
}

// `<Sidenote>` moved to its own client file (components/mdx/Sidenote.tsx) for
// its on-demand popover (hover/click), which keeps the sentence unbroken.
