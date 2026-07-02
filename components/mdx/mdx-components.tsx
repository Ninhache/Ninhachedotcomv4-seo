import { Callout } from './Callout';
import { Chart } from './Chart';
import { Compare, Side } from './Compare';
import { Details } from './Details';
import { Figure } from './Figure';
import { HexDump } from './HexDump';
import { Mark, U } from './Inline';
import { Pre } from './Pre';
import { Reveal } from './Reveal';
import { Ext, SmartAnchor } from './SmartAnchor';
import { Step, Steps } from './Steps';
import { DeltaE, Swatch } from './Swatch';
import { Table, TruthTable } from './Table';
import { Badge, Sidenote, Term, Tok } from './TextMarks';
import { Timeline, TimelineItem } from './Timeline';

/**
 * The component map exposed to article MDX. An article references these by name;
 * anything not listed is a plain Markdown element (styled by `.prose`). Element
 * overrides: `pre` (copy button + language badge), `table` (horizontal scroll),
 * `a` (external links open in a new tab with an icon; `#slug`/relative stay
 * plain). Shared by the server render (`lib/markdown/render-article.tsx`) and
 * the admin client preview (`components/articles/article-preview.tsx`), so every
 * entry must be client-safe.
 */
export const mdxComponents = {
    // block
    Callout,
    Figure,
    Chart,
    Steps,
    Step,
    Compare,
    Side,
    HexDump,
    Swatch,
    DeltaE,
    TruthTable,
    Details,
    Timeline,
    TimelineItem,
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
