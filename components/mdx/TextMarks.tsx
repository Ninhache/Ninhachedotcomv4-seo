import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';
import { BLUE, CYAN, TONE, type Tone, toneSurface } from './tokens';

/**
 * Inline MDX `<Term>`: an abbreviation / glossary term (ΔE, GiST, D65, LTO,
 * AST, ISR...). Renders a native `<abbr title>` with a dotted underline and a
 * help cursor, so hovering surfaces the definition through the browser's own
 * tooltip - no JS, no client component needed. `def` is the full expansion
 * or explanation shown on hover. Presentational.
 */
export function Term({ children, def }: { children?: ReactNode; def: string }) {
    return (
        <abbr
            title={def}
            className="cursor-help"
            style={{
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: 'currentColor',
                textUnderlineOffset: '3px',
            }}
        >
            {children}
        </abbr>
    );
}

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

/**
 * Inline MDX `<Sidenote>`: a Tufte-style side note, e.g.
 * `texte<Sidenote n={1}>la remarque</Sidenote>`. Renders a superscript marker
 * (`n`, or `*` if omitted) at the point of use, followed by the note itself.
 *
 * No page-level gutter is assumed to exist outside the prose column, so
 * instead of a true margin note this floats *within* the column on `lg+`
 * screens (`float-right`, text wraps around it) and drops to a normal
 * bordered block below `lg`. Both variants are always rendered and toggled
 * with `hidden`/`lg:hidden`, so there's no client JS or layout measurement
 * involved - robust across containers, at the cost of a true margin note.
 */
export function Sidenote({
    children,
    n,
}: {
    children?: ReactNode;
    n?: number | string;
}) {
    const marker = n ?? '*';
    return (
        <>
            <sup className="ml-0.5 font-semibold" style={{ color: CYAN }}>
                {marker}
            </sup>
            <span
                className="float-right clear-right mt-1 mb-2 ml-4 hidden w-48 border-l-2 pl-3 text-muted-foreground text-sm lg:block"
                style={{ borderColor: CYAN }}
            >
                {children}
            </span>
            <span
                className="mt-1 mb-2 block border-l-2 pl-3 text-muted-foreground text-sm lg:hidden"
                style={{ borderColor: CYAN }}
            >
                {children}
            </span>
        </>
    );
}
