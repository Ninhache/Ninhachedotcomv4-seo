import { Callout } from './Callout';
import { Chart } from './Chart';
import { Compare, Side } from './Compare';
import { Figure } from './Figure';
import { Mark, U } from './Inline';
import { Pre } from './Pre';
import { Step, Steps } from './Steps';

/**
 * The component map exposed to article MDX. An article body references these by
 * name (`<Callout>`, `<Figure>`, `<Chart>`, `<Steps>`, `<Compare>`, inline
 * `<U>`/`<Mark>`); anything not listed here is a plain Markdown element (styled
 * by `.prose`). `pre` overrides every fenced code block (copy button + language
 * badge). Shared by the server render (`lib/markdown/render-article.tsx`) and
 * the admin client preview (`components/articles/article-preview.tsx`), so all
 * entries must be client-safe.
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
    // inline
    U,
    Mark,
    // element overrides
    pre: Pre,
};
