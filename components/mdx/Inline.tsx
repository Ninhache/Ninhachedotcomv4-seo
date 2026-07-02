import type { ReactNode } from 'react';

// Default accent = the blog's cyan DA token, reused across inline marks.
const ACCENT = '#56dcfc';

type UnderlineType = 'solid' | 'dashed' | 'dotted' | 'wavy' | 'double';

/**
 * Inline MDX `<U>` - an underline you can style and color, used mid-sentence:
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

// Highlighter fill opacity. High enough that low-luminance colors (purple, blue)
// stay visible on the dark surface, low enough that text keeps contrast.
const MARK_ALPHA = 0.4;

/**
 * Turn a `#rgb`/`#rrggbb` color into an `rgba()` at `MARK_ALPHA`. Computed
 * directly (no `color-mix`) so the highlight renders on every browser and the
 * opacity is under our control. Falls back to `color-mix` for named/other CSS
 * colors (`"rebeccapurple"`, `"hsl(...)"`).
 */
function markFill(color: string): string {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (m) {
        let h = m[1];
        if (h.length === 3)
            h = h
                .split('')
                .map(c => c + c)
                .join('');
        const n = Number.parseInt(h, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${MARK_ALPHA})`;
    }
    return `color-mix(in srgb, ${color} ${MARK_ALPHA * 100}%, transparent)`;
}

/**
 * Inline MDX `<Mark>` - a colored highlighter behind the text:
 * `un passage <Mark color="#197dff">important</Mark>`. The background is a
 * translucent tint of `color` (default cyan) so text stays legible on the dark
 * surface. `boxDecorationBreak: clone` keeps the highlight clean across line
 * wraps. Presentational.
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
                background: markFill(color),
                color: 'inherit',
                borderRadius: '0.2em',
                padding: '0 0.15em',
                WebkitBoxDecorationBreak: 'clone',
                boxDecorationBreak: 'clone',
            }}
        >
            {children}
        </mark>
    );
}
