import { Callout } from './Callout';
import { Chart } from './Chart';
import { Figure } from './Figure';
import { Mark, U } from './Inline';

/**
 * The component map exposed to article MDX. An article body references these by
 * name (`<Callout>`, `<Figure>`, `<Chart>`, inline `<U>`/`<Mark>`); anything not
 * listed here is a plain Markdown element (styled by `.prose`). Shared by the
 * server render (`lib/markdown/render-article.tsx`) and the admin client preview
 * (`components/articles/article-preview.tsx`), so all entries must be client-safe.
 */
export const mdxComponents = {
    Callout,
    Figure,
    Chart,
    U,
    Mark,
};
