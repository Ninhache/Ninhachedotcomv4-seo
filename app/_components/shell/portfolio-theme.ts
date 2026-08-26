import type { CSSProperties } from 'react';

/**
 * The navy and cyan reskin of the shadcn tokens, applied to every page outside
 * the one-page portfolio: blog, legal pages, account page.
 *
 * Set as an inline style on the shell element rather than in a stylesheet,
 * which is why anything portalled to `document.body` renders outside the theme
 * and comes back grey. Inline panels instead of modals in this subtree are a
 * consequence of this constant, not a stylistic preference.
 */
export const PORTFOLIO_THEME = {
    '--background': '#0b1422',
    '--foreground': '#e8eef7',
    '--card': '#101d30',
    '--card-foreground': '#e8eef7',
    '--popover': '#101d30',
    '--popover-foreground': '#e8eef7',
    '--primary': '#56dcfc',
    '--primary-foreground': '#08111d',
    '--secondary': '#16243a',
    '--secondary-foreground': '#e8eef7',
    '--muted': '#16243a',
    '--muted-foreground': '#8ea3c0',
    '--accent': '#197dff',
    '--accent-foreground': '#ffffff',
    '--border': 'rgba(86, 220, 252, 0.14)',
    '--input': 'rgba(86, 220, 252, 0.14)',
    '--ring': '#56dcfc',
    '--white': '#e8eef7',
    '--light_blue': '#56dcfc',
    '--fade_light_blue': 'rgba(86, 220, 252, 0.15)',
    '--dark_blue': '#101d30',
    '--fade_dark_blue': 'rgba(16, 29, 48, 0.9)',
} as CSSProperties;
