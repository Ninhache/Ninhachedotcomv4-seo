import type { ComponentPropsWithoutRef } from 'react';
import { TONE, type Tone } from './tokens';

type TriValue = 'T' | 'F' | 'U';

const VALUES: TriValue[] = ['T', 'F', 'U'];

/** Kleene ternary AND: false dominates, then unknown, else true. */
function and(x: TriValue, y: TriValue): TriValue {
    if (x === 'F' || y === 'F') return 'F';
    if (x === 'U' || y === 'U') return 'U';
    return 'T';
}

/** Kleene ternary OR: true dominates, then unknown, else false. */
function or(x: TriValue, y: TriValue): TriValue {
    if (x === 'T' || y === 'T') return 'T';
    if (x === 'U' || y === 'U') return 'U';
    return 'F';
}

const OPS: Record<'and' | 'or', (x: TriValue, y: TriValue) => TriValue> = {
    and,
    or,
};

/** Maps a truth value to its semantic tone (T green, F red, U grey). */
function valueTone(v: TriValue): Tone {
    if (v === 'T') return 'good';
    if (v === 'F') return 'bad';
    return 'neutral';
}

/**
 * `table` element override for arbitrary markdown tables. Wraps in a
 * horizontally scrollable container so wide tables don't break the page on
 * mobile, and lightly borders header/cells (header row tinted). Registered
 * as `table` in `mdx-components.tsx`; generic, spreads through whatever the
 * markdown table produced.
 */
export function Table({
    children,
    ...props
}: ComponentPropsWithoutRef<'table'>) {
    return (
        <div className="not-prose my-6 overflow-x-auto">
            <table
                className="w-full border-collapse text-sm [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold"
                {...props}
            >
                {children}
            </table>
        </div>
    );
}

/**
 * MDX `<TruthTable op="and" | "or">` - a 3x3 Kleene ternary-logic truth
 * table over T (true) / F (false) / U (unknown). The operator sits in the
 * top-left corner, values across the top and down the side; each interior
 * cell is the computed result, tinted by its own tone (T green, F red, U
 * grey) via `color-mix`, same recipe as `toneSurface` in `tokens.ts`.
 * `caption` overrides the default figcaption. Presentational.
 */
export function TruthTable({
    op,
    caption,
}: {
    op: 'and' | 'or';
    caption?: string;
}) {
    const fn = OPS[op];
    return (
        <figure className="not-prose my-8">
            <div className="overflow-x-auto">
                <table className="mx-auto border-collapse text-center font-mono text-sm">
                    <thead>
                        <tr>
                            <th className="border border-border bg-muted/50 px-4 py-2 font-semibold">
                                {op}
                            </th>
                            {VALUES.map(v => (
                                <th
                                    key={v}
                                    className="border border-border bg-muted/50 px-4 py-2 font-semibold"
                                >
                                    {v}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {VALUES.map(x => (
                            <tr key={x}>
                                <th className="border border-border bg-muted/50 px-4 py-2 font-semibold">
                                    {x}
                                </th>
                                {VALUES.map(y => {
                                    const result = fn(x, y);
                                    const accent = TONE[valueTone(result)];
                                    return (
                                        <td
                                            key={y}
                                            className="border border-border px-4 py-2 font-semibold"
                                            style={{
                                                background: `color-mix(in oklch, ${accent} 18%, transparent)`,
                                                color: accent,
                                            }}
                                        >
                                            {result}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                {caption ?? (
                    <>
                        Table de vérité de <code>{op}</code> (logique ternaire
                        T/F/U)
                    </>
                )}
            </figcaption>
        </figure>
    );
}
