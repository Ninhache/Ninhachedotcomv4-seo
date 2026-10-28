import 'server-only';

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { defaultLocale, type Locale, locales } from '@/config';

/**
 * The three legal pages, by slug. The slug is deliberately the same in both
 * languages: only the text is translated, so `/fr/legal/cgu` and
 * `/en/legal/cgu` are two renderings of one page rather than two addresses to
 * keep in sync. That also keeps them out of the blog's per-locale slug
 * resolver, which exists for article titles and has nothing to say here.
 */
export const LEGAL_SLUGS = [
    'cgu',
    'mentions-legales',
    'confidentialite',
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
    return (LEGAL_SLUGS as readonly string[]).includes(value);
}

const LEGAL_DIR = path.join(process.cwd(), 'content', 'legal');

/**
 * Reads one legal page's MDX source, falling back to the default locale when a
 * translation is missing rather than 404-ing: a legal notice that exists in
 * French only must still be reachable from the English site.
 *
 * The read happens at build time (the page is `force-static`), which is what
 * makes it safe in a container whose runtime image is a copy of `.next`.
 * The `content/` directory is copied in anyway, see `dockerfile`.
 */
export async function readLegalPage(
    slug: LegalSlug,
    locale: Locale
): Promise<string | null> {
    const candidates = [locale, defaultLocale, ...locales];
    for (const candidate of candidates) {
        const file = path.join(LEGAL_DIR, `${slug}.${candidate}.mdx`);
        if (existsSync(file)) return readFile(file, 'utf8');
    }
    return null;
}
