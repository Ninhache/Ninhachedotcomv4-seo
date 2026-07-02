import { defaultLocale } from '@/config';
import { baseUrl } from '../baseurl';
import type { ResumeDTO } from '../types';

/**
 * Absolute, browser-reachable URL of the resume PDF for `locale`.
 *
 * Picks the locale-specific translation, falling back to the default locale and
 * then to any available one. Relative backend paths (`/uploads/…`) are prefixed
 * with the API base; already-absolute URLs are returned as-is. Returns `null`
 * when no resume exists, so callers can fall back to their static PDF.
 *
 * Lives outside `resume.api.ts` on purpose: that module wires client-only auth
 * interceptors at import time, so server components must not import it.
 */
export function resolveResumeUrl(
    resume: ResumeDTO | null | undefined,
    locale: string
): string | null {
    const translations = resume?.translations;
    if (!translations?.length) return null;
    const pick =
        translations.find(t => t.locale === locale) ??
        translations.find(t => t.locale === defaultLocale) ??
        translations[0];
    if (!pick?.url) return null;
    return pick.url.startsWith('http') ? pick.url : `${baseUrl}${pick.url}`;
}
