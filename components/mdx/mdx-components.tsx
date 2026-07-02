import type { ComponentType } from 'react';
import { Callout } from './Callout';
import { Card } from './Card';
import { Chart } from './Chart';
import { Compare, Side } from './Compare';
import { Details } from './Details';
import { Divider } from './Divider';
import { FadeIn } from './FadeIn';
import { Figure } from './Figure';
import { Cols, Grid } from './Grid';
import { HexDump } from './HexDump';
import { Mark, U } from './Inline';
import { Lead } from './Lead';
import { Pre } from './Pre';
import { Reveal } from './Reveal';
import { Ext, SmartAnchor } from './SmartAnchor';
import { Spec, Specs } from './Specs';
import { Step, Steps } from './Steps';
import { DeltaE, Swatch } from './Swatch';
import { Table, TruthTable } from './Table';
import { Takeaways } from './Takeaways';
import { Badge, Sidenote, Term, Tok } from './TextMarks';
import { Timeline, TimelineItem } from './Timeline';

/**
 * Wrap a block component so it fades in on scroll (`FadeIn` is the client
 * island; this HOC stays in this server-neutral module so the server render can
 * build the map without calling a client-exported function).
 */
function withFadeIn<P extends object>(Component: ComponentType<P>) {
    return function Faded(props: P) {
        return (
            <FadeIn>
                <Component {...props} />
            </FadeIn>
        );
    };
}

/**
 * The component map exposed to article MDX. An article references these by name;
 * anything not listed is a plain Markdown element (styled by `.prose`).
 *
 * Block components are wrapped in `withFadeIn` so they fade in on scroll like
 * the rest of ninhache.fr (respecting `prefers-reduced-motion`). Their child
 * pieces (`Step`/`Side`/`TimelineItem`/`Spec`) and layout containers (`Grid`)
 * are NOT wrapped so they animate as one unit / let their own children stagger;
 * inline marks are never wrapped (a div would break flow).
 *
 * Element overrides: `pre` (copy button + language badge), `table` (horizontal
 * scroll), `a` (external links open in a new tab with an icon; `#slug`/relative
 * stay plain). Shared by the server render (`lib/markdown/render-article.tsx`)
 * and the admin client preview (`components/articles/article-preview.tsx`), so
 * every entry must be client-safe.
 */
export const mdxComponents = {
    // block (fade-in on scroll)
    Callout: withFadeIn(Callout),
    Figure: withFadeIn(Figure),
    Chart: withFadeIn(Chart),
    Steps: withFadeIn(Steps),
    Compare: withFadeIn(Compare),
    HexDump: withFadeIn(HexDump),
    DeltaE: withFadeIn(DeltaE),
    TruthTable: withFadeIn(TruthTable),
    Details: withFadeIn(Details),
    Timeline: withFadeIn(Timeline),
    Card: withFadeIn(Card),
    Takeaways: withFadeIn(Takeaways),
    Specs: withFadeIn(Specs),
    // block, no fade (children of the above, or layout containers)
    Step,
    Side,
    TimelineItem,
    Spec,
    Grid,
    Cols,
    Swatch,
    Lead,
    Divider,
    // inline
    U,
    Mark,
    Reveal,
    Term,
    Badge,
    Tok,
    Sidenote,
    Ext,
    // element overrides
    pre: Pre,
    table: Table,
    a: SmartAnchor,
};
