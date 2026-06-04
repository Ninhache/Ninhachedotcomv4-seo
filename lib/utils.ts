import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Normalize a stored asset path for use as an image `src`.
 *
 * The backend seeds relative paths such as `svg/skills/Java.svg`. Used raw,
 * those resolve against the current route (e.g. `/admin/skills/svg/...`) and
 * 404. Rooting them with a leading slash makes them resolve against the
 * `public/` directory regardless of route. Absolute URLs and already-rooted
 * paths are returned unchanged.
 */
export function assetUrl(src?: string | null): string {
    if (!src) return '';
    if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
    return `/${src}`;
}
