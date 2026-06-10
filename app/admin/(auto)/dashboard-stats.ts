import type { ContactDTO, Locale, ProjectDTO, SkillDTO } from '@/lib/types';

/** Locales the public site renders. An item is "complete" when both are present. */
export const LOCALES: readonly Locale[] = ['fr', 'en'];

/** Locales absent from a translations array (used to flag untranslated content). */
export function missingLocales(
    translations: { locale: Locale }[] | undefined
): Locale[] {
    const present = new Set((translations ?? []).map(t => t.locale));
    return LOCALES.filter(locale => !present.has(locale));
}

export type Visibility = { total: number; visible: number; hidden: number };

/** Split a list into total / live / hidden based on `isVisible`. */
export function countVisibility(items: { isVisible: boolean }[]): Visibility {
    const visible = items.filter(item => item.isVisible).length;
    return { total: items.length, visible, hidden: items.length - visible };
}

/** A specific item flagged by a health rule, named so the editor knows which one. */
export type Offender = { id: string; name: string };

export type HealthItem = {
    id: string;
    label: string;
    href: string;
    offenders: Offender[];
};

type HealthInput = {
    projects: ProjectDTO[];
    skills: SkillDTO[];
    contacts: ContactDTO[];
};

const FALLBACK = '(sans nom)';

const fromTranslations = (
    translations: { locale: Locale; name: string }[] | undefined
): string => {
    const list = translations ?? [];
    const byLocale = (l: Locale) => list.find(t => t.locale === l)?.name;
    return byLocale('fr') || byLocale('en') || list[0]?.name || FALLBACK;
};

const projectName = (p: ProjectDTO) => fromTranslations(p.translations);
const skillName = (s: SkillDTO) => fromTranslations(s.translations);
const contactName = (c: ContactDTO) =>
    c.nameByLocale?.fr ||
    c.nameByLocale?.en ||
    c.translations?.[0]?.name ||
    FALLBACK;

const isUntranslated = (item: { translations?: { locale: Locale }[] }) =>
    missingLocales(item.translations).length > 0;

/**
 * Actionable content gaps derived from already-fetched DTOs — no extra requests.
 * Each rule names the offending items; only rules with offenders are returned.
 */
export function computeHealth({
    projects,
    skills,
    contacts,
}: HealthInput): HealthItem[] {
    const offendersOf = <T>(
        items: T[],
        predicate: (item: T) => boolean,
        name: (item: T) => string,
        id: (item: T) => string
    ): Offender[] =>
        items
            .filter(predicate)
            .map(item => ({ id: id(item), name: name(item) }));

    const rules: HealthItem[] = [
        {
            id: 'projects-no-media',
            label: 'Projets sans média',
            href: '/admin/projects',
            offenders: offendersOf(
                projects,
                p => (p.medias?.length ?? 0) === 0,
                projectName,
                p => p.id
            ),
        },
        {
            id: 'projects-untranslated',
            label: 'Projets sans traduction (fr/en)',
            href: '/admin/projects',
            offenders: offendersOf(
                projects,
                isUntranslated,
                projectName,
                p => p.id
            ),
        },
        {
            id: 'skills-untranslated',
            label: 'Skills sans traduction (fr/en)',
            href: '/admin/skills',
            offenders: offendersOf(
                skills,
                isUntranslated,
                skillName,
                s => s.id
            ),
        },
        {
            id: 'contacts-untranslated',
            label: 'Contacts sans traduction (fr/en)',
            href: '/admin/contacts',
            offenders: offendersOf(
                contacts,
                isUntranslated,
                contactName,
                c => c.id
            ),
        },
    ];

    return rules.filter(rule => rule.offenders.length > 0);
}
