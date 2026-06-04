// Backend (back-office) API base URL. Must be NEXT_PUBLIC_ prefixed because the
// admin axios clients run in the browser — without the prefix the value is
// stripped from the client bundle and silently falls back to localhost in prod.
// The legacy server-only name is kept as a fallback for existing setups.
export const baseUrl =
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ||
    process.env.NEXT_BACKOFFICE_URL ||
    'http://localhost:5000';

/**
 * Resolve a stored media URL to something an <img>/src can load.
 * - Absolute URLs are returned as-is.
 * - Uploaded media (`/uploads/...`) are served by the backend → prefix baseUrl.
 * - Everything else (e.g. seeded `/images/projects/...`) lives in the frontend
 *   `public/` folder → use the path as-is (rooted with a leading slash).
 */
export function mediaSrc(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/uploads')) return `${baseUrl}${url}`;
    return url.startsWith('/') ? url : `/${url}`;
}
