import { ArrowUpRight, Github } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

type SmartAnchorProps = ComponentPropsWithoutRef<'a'> & { href?: string };

function isExternal(href?: string): boolean {
    return !!href && /^https?:\/\//.test(href);
}

/**
 * True for links that point at GitHub itself (repos, issues, gists), so they can
 * carry the GitHub mark instead of the generic arrow. Deliberately does *not*
 * match `*.github.io`: a Pages site is someone's website, not GitHub.
 */
function isGithub(href?: string): boolean {
    return !!href && /^https?:\/\/(www\.|gist\.)?github\.com(\/|$)/i.test(href);
}

/**
 * Shared render for an external link: opens in a new tab and appends a small
 * icon. Factored out so `<Ext>` can reuse it without going through
 * `SmartAnchor`'s href sniffing.
 *
 * The trailing icon is the GitHub mark for github.com links and the generic
 * "leaves the page" arrow for everything else, which means an ordinary markdown
 * link to a repository gets recognised without any special syntax in the body.
 */
function ExternalAnchor({ href, children, ...props }: SmartAnchorProps) {
    const Icon = isGithub(href) ? Github : ArrowUpRight;
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
            <Icon
                aria-hidden="true"
                className="ml-0.5 inline size-[0.9em] align-text-top"
            />
        </a>
    );
}

/**
 * `a` override for MDX (registered as `a` in `mdx-components.tsx`, so every
 * markdown link goes through it). External links (`http(s)://`) open in a new
 * tab with `rel="noopener noreferrer"` and a trailing icon (the GitHub mark on
 * github.com, an arrow elsewhere); everything else (relative paths, `#slug`
 * heading anchors, `mailto:`) renders as a plain `<a>` with no target and no
 * icon. Presentational, no client needed.
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
 * Force the external treatment (new tab + trailing icon) regardless of `href`'s
 * shape - for manual use when a same-origin or non-`http(s)` link should still
 * be flagged as "leaving the flow" (a download, an anchor into another app).
 */
export function Ext(props: SmartAnchorProps) {
    return <ExternalAnchor {...props} />;
}
