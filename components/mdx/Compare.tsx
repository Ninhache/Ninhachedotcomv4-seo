import type { ReactNode } from 'react';
import { type Tone, toneSurface } from './tokens';

/**
 * One panel of a `<Compare>`. `tone` colors the label chip + border:
 * `bad` (rouge, la v1 cassée), `good` (vert, la v2), `neutral` (défaut).
 */
export function Side({
    label,
    tone = 'neutral',
    children,
}: {
    label?: string;
    tone?: Tone;
    children?: ReactNode;
}) {
    const s = toneSurface(tone);
    return (
        <div
            className="rounded-lg border p-4"
            style={{ borderColor: s.borderColor, background: s.background }}
        >
            {label && (
                <div
                    className="mb-2 inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-xs"
                    style={{
                        color: s.accent,
                        background: `color-mix(in oklch, ${s.accent} 15%, transparent)`,
                    }}
                >
                    {label}
                </div>
            )}
            <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
                {children}
            </div>
        </div>
    );
}

/**
 * MDX `<Compare>` — two panels side by side (stacked on mobile) for the blog's
 * signature narrative: avant/après, candidat A vs B, chiffres qui tranchent.
 * Wrap two `<Side label tone>` inside. Presentational.
 */
export function Compare({ children }: { children?: ReactNode }) {
    return (
        <div className="not-prose my-6 grid gap-4 sm:grid-cols-2">
            {children}
        </div>
    );
}
