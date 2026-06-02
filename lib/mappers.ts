import { SORT_TYPE, SortType } from '@/app/_components/project/projects';
import type { Locale } from '@/config';
import type { Experience, Project, SkillCategory } from '@/jsons/jsonUtils';
import type {
    ContactDTO,
    ExperienceDTO,
    ProjectDTO,
    SkillCategoryDTO,
} from './types';

interface SocialProps {
    text: string;
    imageUrl: string;
    redirectLink: string;
    cssSize: string;
}

function formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${year}`;
}

function formatExperienceDate(startIso: string, endIso: string): string {
    const opts: Intl.DateTimeFormatOptions = {
        month: 'short',
        year: 'numeric',
    };
    const start = new Date(startIso).toLocaleDateString('en-US', opts);
    const end = new Date(endIso).toLocaleDateString('en-US', opts);
    return `${start} - ${end}`;
}

function monthsSince(startIso: string): number {
    const start = new Date(startIso);
    const now = new Date();
    return (
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth())
    );
}

/**
 * Display label for a project's timespan.
 * - With an end date: "MM/YYYY - MM/YYYY".
 * - Ongoing (no end date): localized "depuis plus de X ans/mois" / "for over X years/months".
 */
function formatProjectDate(
    startIso: string,
    endIso: string | null | undefined,
    locale: Locale
): string {
    if (endIso) return `${formatDate(startIso)} - ${formatDate(endIso)}`;

    const months = Math.max(monthsSince(startIso), 1);
    if (months >= 12) {
        const years = Math.floor(months / 12);
        return locale === 'en'
            ? `for over ${years} year${years > 1 ? 's' : ''}`
            : `depuis plus de ${years} an${years > 1 ? 's' : ''}`;
    }
    return locale === 'en'
        ? `for over ${months} month${months > 1 ? 's' : ''}`
        : `depuis plus de ${months} mois`;
}

export function mapProject(dto: ProjectDTO, locale: Locale): Project {
    const startIso = dto.startDate ?? dto.date ?? new Date().toISOString();
    const translationsRecord = {} as Project['translations'];
    for (const t of dto.translations) {
        translationsRecord[t.locale as Locale] = {
            description: t.description,
            type: t.type ?? '',
        };
    }

    const techTags = dto.techTags.map(tag => {
        const enTranslation = tag.translations?.find(t => t.locale === 'en');
        const frTranslation = tag.translations?.find(t => t.locale === 'fr');
        const name =
            enTranslation?.name ??
            frTranslation?.name ??
            tag.nameByLocale?.en ??
            '';
        return { name, url: '#' };
    });

    const sortCategories: SortType[] = dto.qualTags
        .map(tag => {
            const name =
                tag.translations?.find(t => t.locale === 'en')?.name ??
                tag.nameByLocale?.en ??
                '';
            return SORT_TYPE[name.toUpperCase() as keyof typeof SORT_TYPE];
        })
        .filter((s): s is SortType => Boolean(s));

    const imageMedia = dto.medias.find(m => m.type === 'IMAGE');
    const videoMedia = dto.medias.find(m => m.type === 'VIDEO');

    return {
        title:
            dto.translations.find(t => t.locale === 'en')?.name ??
            dto.translations[0]?.name ??
            '',
        date: formatProjectDate(startIso, dto.endDate, locale),
        startDate: startIso,
        ongoing: !dto.endDate,
        translations: translationsRecord,
        tags: techTags,
        links: {
            redirect: dto.visitUrl ?? 'none',
            git: dto.gitUrl ?? 'none',
            play: dto.playUrl ?? 'none',
        },
        videoUrl: videoMedia?.mediaUrl ?? 'none',
        image: imageMedia?.mediaUrl ?? '',
        logo: dto.logoUrl ?? '',
        sortCategories,
    };
}

export function mapExperience(dto: ExperienceDTO): Experience {
    const translationsRecord = {} as Experience['translations'];
    for (const t of dto.translations) {
        translationsRecord[t.locale as Locale] = {
            type: dto.contractType,
            description: t.description,
            jobtitle: t.jobTitle,
        };
    }

    const tags = (dto.tags ?? []).map(tag => {
        const enTranslation = tag.translations?.find(t => t.locale === 'en');
        const frTranslation = tag.translations?.find(t => t.locale === 'fr');
        const name = enTranslation?.name ?? frTranslation?.name ?? '';
        return { name, url: '#' };
    });

    return {
        title: dto.companyName,
        date: formatExperienceDate(dto.startDate, dto.endDate),
        translations: translationsRecord,
        tags,
        link: dto.siteUrl ?? '#',
        image: dto.imageUrl ?? '',
    };
}

export function mapSkillCategory(dto: SkillCategoryDTO): SkillCategory {
    const translationsRecord = {} as SkillCategory['translations'];
    for (const t of dto.translations) {
        translationsRecord[t.locale as Locale] = { name: t.name };
    }

    const skills = dto.skills.map(skill => {
        const enTranslation = skill.translations.find(t => t.locale === 'en');
        const frTranslation = skill.translations.find(t => t.locale === 'fr');
        const logo = skill.image?.startsWith('http')
            ? skill.image
            : `/${skill.image}`;
        return {
            name: enTranslation?.name ?? frTranslation?.name ?? '',
            logo,
            link: skill.wikiUrl ?? '#',
        };
    });

    return { translations: translationsRecord, skills };
}

export function mapContact(dto: ContactDTO, locale: Locale): SocialProps {
    return {
        text: dto.nameByLocale[locale] ?? dto.nameByLocale['en'] ?? '',
        imageUrl: dto.imageUrl,
        redirectLink: dto.contactUrl,
        cssSize: dto.cssSize ?? 'auto',
    };
}
