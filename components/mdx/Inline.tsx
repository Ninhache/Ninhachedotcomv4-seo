import type { ReactNode } from 'react';

// Default accent = the blog's cyan DA token, reused across inline marks.
const ACCENT = '#56dcfc';

type UnderlineType = 'solid' | 'dashed' | 'dotted' | 'wavy' | 'double';

/**
 * Inline MDX `<U>` — an underline you can style and color, used mid-sentence:
 * `un mot <U type="dashed" color="#197dff">souligné</U> dans le texte`.
 * `type` maps to CSS `text-decoration-style`; `color` accepts any CSS color.
 * Presentational (works server- and client-side).
 */
export function U({
    children,
    type = 'solid',
    color = ACCENT,
}: {
    children?: ReactNode;
    type?: UnderlineType;
    color?: string;
}) {
    return (
        <span
            style={{
                textDecorationLine: 'underline',
                textDecorationStyle: type,
                textDecorationColor: color,
                textDecorationThickness: '2px',
                textUnderlineOffset: '3px',
            }}
        >
            {children}
        </span>
    );
}

/**
 * Inline MDX `<Mark>` — a colored highlighter behind the text:
 * `un passage <Mark color="#197dff">important</Mark>`. The background is a
 * translucent tint of `color` (default cyan) so text stays legible on the dark
 * surface. Presentational.
 */
export function Mark({
    children,
    color = ACCENT,
}: {
    children?: ReactNode;
    color?: string;
}) {
    return (
        <mark
            style={{
                backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)`,
                color: 'inherit',
                borderRadius: '0.2em',
                padding: '0 0.15em',
            }}
        >
            {children}
        </mark>
    );
}
