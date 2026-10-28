/**
 * localStorage that never throws. Private windows, blocked site data and the
 * server all make the real one unusable; the fun layer must keep working
 * there, it simply forgets. Every key it writes is listed in the privacy page
 * (`content/legal/confidentialite.*.mdx`).
 */

export function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
}

export function writeJson(key: string, value: unknown): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage unavailable: nothing to remember, nothing to report.
    }
}
