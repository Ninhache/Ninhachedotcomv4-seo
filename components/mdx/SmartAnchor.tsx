import { ArrowUpRight } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

type SmartAnchorProps = ComponentPropsWithoutRef<'a'> & { href?: string };

// Anchors starting with a scheme get the "leaving the site" treatment; relative
// paths, `#slug` (rehype-autolink-headings), `mailto:`, etc. stay plain.
function isExternal(href?: string): boolean {
    return !!href && /^https?:\/\//.test(href);
}

/**
 * Shared render for an external link: opens in a new tab and appends a small
 * arrow icon. Factored out so `<Ext>` can reuse it without going through
 * `SmartAnchor`'s href sniffing.
 */
function ExternalAnchor({ href, children, ...props }: SmartAnchorProps) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
            <ArrowUpRight
                aria-hidden="true"
                className="ml-0.5 inline size-[0.9em] align-text-top"
            />
        </a>
    );
}

/**
 * `a` override for MDX (registered as `a` in `mdx-components.tsx`, so every
 * markdown link goes through it). External links (`http(s)://`) open in a new
 * tab with `rel="noopener noreferrer"` and a small arrow icon; everything else
 * (relative paths, `#slug` heading anchors, `mailto:`) renders as a plain `<a>`
 * with no target and no icon. Presentational, no client needed.
 */
export function SmartAnchor({ href, children, ...props }: SmartAnchorProps) {
    if (isExternal(href)) {
        return (
            <ExternalAnchor href={href} {...props}>
                {children}
            </ExternalAnchor>
        );
    }
    return (
        <a href={href} {...props}>
            {children}
        </a>
    );
}

/**
 * Force the external treatment (new tab + arrow icon) regardless of `href`'s
 * shape - for manual use when a same-origin or non-`http(s)` link should still
 * be flagged as "leaving the flow" (a download, an anchor into another app).
 */
export function Ext(props: SmartAnchorProps) {
    return <ExternalAnchor {...props} />;
}
