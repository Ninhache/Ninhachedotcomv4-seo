import type { Locale } from '@/config';

// Project sort/filter categories. Kept in a plain (non-'use client') module so
// it can be used both server-side (lib/mappers.ts) and client-side
// (app/_components/project/projects.tsx). When this lived in the client
// component, importing the runtime value SORT_TYPE into the server-side mapper
// yielded a client-reference proxy, so `sortCategories` came out empty.
export const SORT_TYPE = {
    DATE: 'date',
    SCHOOL: 'school',
    PERSONAL: 'personal',
    WEB: 'web',
    SIMULATIONS: 'simulations',
    RANDOM: 'random',
} as const;

export type SortType = (typeof SORT_TYPE)[keyof typeof SORT_TYPE];

// Localized display label per category. `date`/`random` aren't real categories.
export const CATEGORY_LABELS: Record<SortType, Record<Locale, string>> = {
    date: { fr: '', en: '' },
    random: { fr: '', en: '' },
    school: { fr: 'Projet scolaire', en: 'School project' },
    personal: { fr: 'Projet personnel', en: 'Personal project' },
    web: { fr: 'Projet web', en: 'Web project' },
    simulations: { fr: 'Simulation', en: 'Simulation' },
};

/** Joined display label for a list of categories, e.g. "Projet personnel · Projet web". */
export function categoryTypeLabel(
    categories: SortType[],
    locale: Locale
): string {
    return categories
        .map(c => CATEGORY_LABELS[c]?.[locale])
        .filter(Boolean)
        .join(' · ');
}

// Categories that describe the *nature* of a project (shown as its "type"
// label). Domain categories like `web`/`simulations` are kept for sorting but
// not displayed.
const NATURE_CATEGORIES: SortType[] = ['personal', 'school'];

/** Display "type" label: only the nature categories (Personnel / Scolaire). */
export function projectTypeLabel(
    categories: SortType[],
    locale: Locale
): string {
    return categoryTypeLabel(
        categories.filter(c => NATURE_CATEGORIES.includes(c)),
        locale
    );
}
