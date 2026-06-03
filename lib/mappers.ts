import type { Locale } from '@/config';
import type { Experience, Project, SkillCategory } from '@/jsons/jsonUtils';
import { mediaSrc } from '@/lib/baseurl';
import {
    projectTypeLabel,
    SORT_TYPE,
    type SortType,
} from '@/lib/project-categories';
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

/**
 * Display label for a project's timespan.
 * - With an end date: "MM/YYYY - MM/YYYY" (or a single "MM/YYYY" when start and
 *   end fall in the same month).
 * - Ongoing (no end date): "Depuis MM/YYYY" / "Since MM/YYYY".
 */
function formatProjectDate(
    startIso: string,
    endIso: string | null | undefined,
    locale: Locale
): string {
    if (endIso) {
        const start = formatDate(startIso);
        const end = formatDate(endIso);
        return start === end ? start : `${start} - ${end}`;
    }
    return locale === 'en'
        ? `Since ${formatDate(startIso)}`
        : `Depuis ${formatDate(startIso)}`;
}

export function mapProject(dto: ProjectDTO, locale: Locale): Project {
    const startIso = dto.startDate ?? dto.date ?? new Date().toISOString();

    const sortCategories: SortType[] = dto.qualTags
        .map(tag => {
            const name =
                tag.translations?.find(t => t.locale === 'en')?.name ??
                tag.nameByLocale?.en ??
                '';
            return SORT_TYPE[name.toUpperCase() as keyof typeof SORT_TYPE];
        })
        .filter((s): s is SortType => Boolean(s));

    const translationsRecord = {} as Project['translations'];
    for (const t of dto.translations) {
        const loc = t.locale as Locale;
        // The backend `type` is null since the migration — derive a localized
        // label from the project's nature category (personal/school) instead.
        translationsRecord[loc] = {
            description: t.description,
            type: t.type ?? projectTypeLabel(sortCategories, loc),
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
        videoUrl: videoMedia?.mediaUrl ? mediaSrc(videoMedia.mediaUrl) : 'none',
        image: imageMedia?.mediaUrl ? mediaSrc(imageMedia.mediaUrl) : '',
        logo: dto.logoUrl ? mediaSrc(dto.logoUrl) : '',
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
