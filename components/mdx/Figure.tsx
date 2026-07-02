import { mediaSrc } from '@/lib/baseurl';

/**
 * MDX `<Figure>` - a centered image with an optional caption/credit. `src`
 * accepts an `/uploads/…` path, a `public/` path, or an absolute URL (resolved
 * via `mediaSrc`). `not-prose` so the surrounding `.prose` doesn't fight the
 * figure's own spacing.
 */
export function Figure({
    src,
    alt = '',
    caption,
    credit,
}: {
    src: string;
    alt?: string;
    caption?: string;
    credit?: string;
}) {
    return (
        <figure className="not-prose my-8">
            <img
                src={mediaSrc(src)}
                alt={alt}
                loading="lazy"
                className="mx-auto max-h-[70vh] max-w-full rounded-xl border border-border"
            />
            {(caption || credit) && (
                <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                    {caption}
                    {credit && (
                        <span className="opacity-70">
                            {caption ? ` (${credit})` : credit}
                        </span>
                    )}
                </figcaption>
            )}
        </figure>
    );
}
