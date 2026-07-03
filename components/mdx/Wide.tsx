import type { ReactNode } from 'react';
import { mediaSrc } from '@/lib/baseurl';

/**
 * MDX `<Wide>` - a figure that breaks out wider than the text column to breathe.
 * The article text is `max-w-3xl` inside a left-aligned column with a TOC to its
 * right, so the breakout only kicks in from `xl` up (below that the column is too
 * tight to widen without overflowing); it stays column-width on smaller screens.
 * Pass an image via `src`, or arbitrary media (Chart, HexDump…) as children.
 */
export function Wide({
    src,
    alt = '',
    caption,
    children,
}: {
    src?: string;
    alt?: string;
    caption?: string;
    children?: ReactNode;
}) {
    return (
        <figure className="not-prose my-10 xl:-mx-16">
            {src ? (
                <img
                    src={mediaSrc(src)}
                    alt={alt}
                    loading="lazy"
                    className="w-full rounded-xl border border-border object-cover"
                />
            ) : (
                children
            )}
            {caption && (
                <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
