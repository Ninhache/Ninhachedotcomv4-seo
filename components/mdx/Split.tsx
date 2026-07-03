import type { ReactNode } from 'react';
import { mediaSrc } from '@/lib/baseurl';
import { PANEL_BODY } from './tokens';

type Side = 'left' | 'right';
type Ratio = 'balanced' | 'media' | 'text';

const RATIO_WIDTH: Record<Ratio, string> = {
    balanced: 'md:w-1/2',
    media: 'md:w-3/5',
    text: 'md:w-2/5',
};

/**
 * MDX `<Split>` - an image on one side, text (children) on the other. Stacks
 * to image-on-top on mobile regardless of `side`. `image` accepts an
 * `/uploads/…` path, a `public/` path, or an absolute URL (resolved via
 * `mediaSrc`). `side` picks which column the image sits in on desktop;
 * `ratio` controls the image column's relative width.
 */
export function Split({
    image,
    side = 'left',
    alt = '',
    caption,
    ratio = 'balanced',
    children,
}: {
    image: string;
    side?: Side;
    alt?: string;
    caption?: string;
    ratio?: Ratio;
    children?: ReactNode;
}) {
    return (
        <div
            className={`not-prose my-8 flex flex-col gap-6 md:flex-row md:items-center md:gap-8 ${
                side === 'right' ? 'md:flex-row-reverse' : ''
            }`}
        >
            <figure className={`shrink-0 ${RATIO_WIDTH[ratio]}`}>
                <img
                    src={mediaSrc(image)}
                    alt={alt}
                    loading="lazy"
                    className="w-full rounded-xl border border-border"
                />
                {caption && (
                    <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                        {caption}
                    </figcaption>
                )}
            </figure>
            <div className={`md:flex-1 ${PANEL_BODY}`}>{children}</div>
        </div>
    );
}
