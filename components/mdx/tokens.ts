/**
 * Shared design tokens for the MDX component library. Centralized so every
 * component pulls from the same palette / radii / semantic colors - the ideas
 * doc explicitly values coherence over quantity (same radii, palette, states).
 */

// Brand accents (the blog's cyan/blue DA).
export const CYAN = '#56dcfc';
export const BLUE = '#197dff';

/** Semantic accents, in oklch so they sit right on the dark navy surface. */
export const TONE = {
    bad: 'oklch(0.65 0.2 25)', // red - broken / before / danger
    good: 'oklch(0.72 0.16 155)', // green - fixed / after / ok
    warn: 'oklch(0.78 0.15 80)', // amber - trap / caution
    lesson: 'oklch(0.62 0.19 300)', // violet - takeaway / lesson
    info: 'oklch(0.7 0.13 235)', // blue - neutral info
    neutral: 'oklch(0.7 0.04 260)', // slate - default
} as const;

export type Tone = keyof typeof TONE;

/**
 * Inline styles for a bordered/tinted surface in a given tone - used by
 * `<Compare>`, `<Badge>`, panels, etc. `accent` drives border + label; `fill`
 * is the translucent background tint.
 */
export function toneSurface(tone: Tone) {
    const accent = TONE[tone] ?? TONE.neutral;
    return {
        accent,
        borderColor: `color-mix(in oklch, ${accent} 55%, transparent)`,
        background: `color-mix(in oklch, ${accent} 10%, transparent)`,
    };
}

/**
 * Utility classes for a panel body inside a `not-prose` container. `not-prose`
 * (needed on panels so the ambient `.prose` doesn't fight custom layout, and so
 * `<Steps>`/`<Timeline>` suppress prose's own `<ol>` counters) also strips list
 * bullets and paragraph spacing via Tailwind's reset. This restores markdown
 * basics (lists, paragraph rhythm, links) plus trims the first/last margin so
 * content sits flush inside the panel.
 */
export const PANEL_BODY =
    '[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline';
