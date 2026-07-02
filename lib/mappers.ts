import type { Locale } from '@/config';
import type {
    EmployerWithMissions,
    MissionView,
    PositionView,
    Project,
    SkillCategory,
} from '@/jsons/jsonUtils';
import { mediaSrc } from '@/lib/baseurl';
import {
    projectTypeLabel,
    SORT_TYPE,
    type SortType,
} from '@/lib/project-categories';
import type {
    CompanyDTO,
    ContactDTO,
    MissionDTO,
    PositionDTO,
    ProjectDTO,
    SkillCategoryDTO,
    SkillDTO,
    TimelinePayloadDTO,
} from './types';

/**
 * Resolve a Skill into a renderable chip: a locale-aware name plus its wiki
 * link. Skills are the unified tech-stack entity (they absorbed the former TECH
 * tags), so every project/mission/company chip now flows through here — and a
 * `wikiUrl` makes the chip a real link instead of a plain span.
 */
function skillChip(
    skill: SkillDTO,
    locale: Locale
): { name: string; url: string } {
    const enT = skill.translations?.find(t => t.locale === 'en');
    const frT = skill.translations?.find(t => t.locale === 'fr');
    const name =
        (locale === 'fr' ? frT?.name : enT?.name) ??
        enT?.name ??
        frT?.name ??
        '';
    return { name, url: skill.wikiUrl ?? '#' };
}

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

    const sortCategories: SortType[] = (dto.natures ?? [])
        .map(n => SORT_TYPE[n as keyof typeof SORT_TYPE])
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

    const techTags = (dto.skills ?? []).map(skill => skillChip(skill, locale));

    const imageMedia = dto.medias.find(m => m.type === 'IMAGE');
    const videoMedia = dto.medias.find(m => m.type === 'VIDEO');

    return {
        title:
            dto.translations.find(t => t.locale === 'en')?.name ??
            dto.translations[0]?.name ??
            '',
        date: formatProjectDate(startIso, dto.endDate, locale),
        startDate: startIso,
        endDate: dto.endDate ?? undefined,
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

/**
 * Period label for an employer/mission: "Jan 2024 - Mar 2025", or
 * "Jan 2024 - {presentLabel}" when the end date is null (current role).
 * Months are rendered en-US ("Jan") regardless of locale, matching the rest of
 * the site's date display; only the open-ended word is localized via
 * `presentLabel`.
 */
function formatTimelineRange(
    startIso: string,
    endIso: string | null,
    presentLabel: string
): string {
    const opts: Intl.DateTimeFormatOptions = {
        month: 'short',
        year: 'numeric',
    };
    const start = new Date(startIso).toLocaleDateString('en-US', opts);
    const end = endIso
        ? new Date(endIso).toLocaleDateString('en-US', opts)
        : presentLabel;
    // Same month (start === end) → a single label, not "Sep 2025 - Sep 2025".
    return start === end ? start : `${start} - ${end}`;
}

/**
 * Builds the public "where I've worked" timeline from the unified Company/Mission
 * model (GET /timeline). EMPLOYER fiches are grouped by name into ONE card per
 * employer (ordered by `order`): an employer may be split into several dated
 * fiches so the standalone timeline can draw separate bars (e.g. two internships
 * with a gap), but the portfolio shows a single consolidated card whose header
 * spans the whole group (earliest start → latest end) and whose missions are the
 * union of every fiche's visible missions. A group renders as long as ANY of its
 * fiches is visible — a hidden fiche still contributes its missions/positions.
 * Translations resolve to `locale` server-side (falling back to the first
 * available). `presentLabel` localizes the open-ended period word.
 */
export function mapTimelineToEmployers(
    dto: TimelinePayloadDTO,
    locale: Locale,
    presentLabel: string
): EmployerWithMissions[] {
    // Resolve client company names by id so each mission can surface the client
    // it was carried out for (the EMPLOYER→CLIENT→MISSION link, made visible).
    const companyNameById = new Map(dto.companies.map(c => [c.id, c.name]));
    // Background illustrations by id so a mission card can show its client's
    // background (or the employer's, for in-house missions). The public site
    // uses the « fond » here, not the timeline-only logo.
    const companyLogoById = new Map(
        dto.companies.map(c => [c.id, c.backgroundUrl ?? ''])
    );
    // Localisation by id so a mission can surface where it took place (the
    // client's city at-client, otherwise the employer's).
    const companyLocationById = new Map(
        dto.companies.map(c => [c.id, c.localisation ?? ''])
    );
    // A company's OWN translated blurb by id — drives both the employer card
    // and (for a client mission) the client block shown in the mission modal.
    const companyDescById = new Map(
        dto.companies.map(c => [
            c.id,
            c.translations?.find(t => t.locale === locale)?.description ??
                c.translations?.[0]?.description ??
                '',
        ])
    );

    // Build one mission view-model from a mission and its OWNING employer fiche
    // (the employer carries the in-house illustration/location fallbacks).
    const toMissionView = (
        mission: MissionDTO,
        owner: CompanyDTO
    ): MissionView => {
        const tr =
            mission.translations.find(t => t.locale === locale) ??
            mission.translations[0];
        const tags = (mission.skills ?? []).map(skill =>
            skillChip(skill, locale)
        );
        // Illustration shown on the card/modal: the mission's own image when
        // set, else the client's background at-client, else the employer's own
        // background (the public « fond », not the timeline-only logo).
        const rawLogo =
            mission.imageUrl ||
            (mission.clientCompanyId
                ? companyLogoById.get(mission.clientCompanyId) ||
                  (owner.backgroundUrl ?? '')
                : (owner.backgroundUrl ?? ''));
        // Where it happened: the client's city at-client, else the employer's
        // (a client without its own localisation falls back to the employer).
        const location = mission.clientCompanyId
            ? companyLocationById.get(mission.clientCompanyId) ||
              (owner.localisation ?? '')
            : (owner.localisation ?? '');

        return {
            title: tr?.title ?? '',
            context: tr?.context ?? '',
            tasks: tr?.tasks ?? [],
            date: formatTimelineRange(
                mission.startDate,
                mission.endDate,
                presentLabel
            ),
            start: mission.startDate,
            end: mission.endDate,
            client: mission.clientCompanyId
                ? (companyNameById.get(mission.clientCompanyId) ?? '')
                : '',
            location,
            // The client company's own blurb (distinct from this mission's
            // context); '' for in-house missions.
            clientDescription: mission.clientCompanyId
                ? (companyDescById.get(mission.clientCompanyId) ?? '')
                : '',
            logoUrl: rawLogo ? mediaSrc(rawLogo) : '',
            tags,
        };
    };

    // Most-recent-first, like the experience cards. Primary key is the end date
    // descending (an ongoing mission — null end — sorts first as +Infinity); on
    // overlap the mission that ended later leads. Start date descending breaks
    // ties, then the admin `order` as a final, stable tiebreaker.
    const byMissionRecency = (a: MissionDTO, b: MissionDTO) => {
        const aEnd = a.endDate
            ? new Date(a.endDate).getTime()
            : Number.POSITIVE_INFINITY;
        const bEnd = b.endDate
            ? new Date(b.endDate).getTime()
            : Number.POSITIVE_INFINITY;
        if (bEnd !== aEnd) return bEnd - aEnd;
        const startDiff =
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        if (startDiff !== 0) return startDiff;
        return (a.order ?? 0) - (b.order ?? 0);
    };

    const toPositionView = (position: PositionDTO): PositionView => {
        const tr =
            position.translations.find(t => t.locale === locale) ??
            position.translations[0];
        return {
            title: tr?.title ?? '',
            date: formatTimelineRange(
                position.startDate,
                position.endDate,
                presentLabel
            ),
            start: position.startDate,
            end: position.endDate,
            current: position.endDate === null,
        };
    };

    // Group EMPLOYER fiches by name. A single employer can be split across
    // several fiches (e.g. two internships with a gap) so the *timeline* can
    // draw separate dated bars — but the public portfolio shows ONE card per
    // employer. The group is rendered as long as ANY of its fiches is visible;
    // a hidden fiche still contributes its missions/positions to the merged
    // card (that's how the gap-internship's second mission resurfaces here),
    // it just doesn't, on its own, make the employer appear.
    const employerGroups = new Map<string, CompanyDTO[]>();
    for (const c of dto.companies) {
        if (c.kind !== 'EMPLOYER') continue;
        const group = employerGroups.get(c.name);
        if (group) group.push(c);
        else employerGroups.set(c.name, [c]);
    }

    return (
        Array.from(employerGroups.values())
            .filter(members => members.some(c => c.isVisible))
            // Fiches in display order; the "primary" fiche (first visible by
            // `order`, else first overall) sources the card's scalar fields.
            .map(members =>
                [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            )
            // Card order across employers follows the primary fiche's `order`.
            .sort((a, b) => {
                const pa = a.find(c => c.isVisible) ?? a[0];
                const pb = b.find(c => c.isVisible) ?? b[0];
                return (pa.order ?? 0) - (pb.order ?? 0);
            })
            .map(ordered => {
                const primary = ordered.find(c => c.isVisible) ?? ordered[0];
                const members = ordered;

                // Header span across the whole group: earliest start → latest end.
                // A null end on any fiche means "current employer" → the merged
                // span is open-ended too.
                const starts = members
                    .map(c => c.employmentStart)
                    .filter((d): d is string => Boolean(d));
                const minStart = starts.reduce<string | null>(
                    (min, d) =>
                        min === null || new Date(d) < new Date(min) ? d : min,
                    null
                );
                const anyOngoing = members.some(
                    c => c.employmentStart && c.employmentEnd === null
                );
                const ends = members
                    .map(c => c.employmentEnd)
                    .filter((d): d is string => Boolean(d));
                const maxEnd = anyOngoing
                    ? null
                    : ends.reduce<string | null>(
                          (max, d) =>
                              max === null || new Date(d) > new Date(max)
                                  ? d
                                  : max,
                          null
                      );

                // Union of every fiche's visible missions, each paired with its
                // owning fiche (for the in-house illustration/location fallback),
                // then sorted as one most-recent-first list.
                const missions = members
                    .flatMap(c =>
                        dto.missions
                            .filter(
                                m => m.employerCompanyId === c.id && m.isVisible
                            )
                            .map(m => ({ mission: m, owner: c }))
                    )
                    .sort((a, b) => byMissionRecency(a.mission, b.mission))
                    .map(({ mission, owner }) => toMissionView(mission, owner));

                // Union of every fiche's visible positions (job-title progression),
                // newest → oldest so the current role leads.
                const positions = members
                    .flatMap(c =>
                        (dto.positions ?? []).filter(
                            p => p.companyId === c.id && p.isVisible
                        )
                    )
                    .sort(
                        (a, b) =>
                            new Date(b.startDate).getTime() -
                                new Date(a.startDate).getTime() ||
                            (b.order ?? 0) - (a.order ?? 0)
                    )
                    .map(toPositionView);

                // Card blurb: the primary fiche's OWN translated description, period.
                // No fallback to mission context — the card speaks for the company,
                // mission detail lives in the modal. Empty → the card renders no
                // blurb (ExperienceItem guards on `description`).
                const description = companyDescById.get(primary.id) ?? '';
                // "type · jobtitle" line: the current/most-recent role (positions
                // arrive newest-first).
                const roleTitle = positions[0]?.title ?? '';
                // Card tags: the employers' OWN curated skills (a deliberately small,
                // broad set), unioned across the group's fiches and de-duped by id —
                // NOT an aggregation of every mission's skills. Per-mission skills
                // stay in the modal.
                const skillById = new Map<string, SkillDTO>();
                for (const c of ordered) {
                    for (const s of c.skills ?? []) {
                        if (!skillById.has(s.id)) skillById.set(s.id, s);
                    }
                }
                const cardTags = Array.from(skillById.values()).map(skill =>
                    skillChip(skill, locale)
                );

                return {
                    companyName: primary.name,
                    contractType: primary.contractType ?? '',
                    date: minStart
                        ? formatTimelineRange(minStart, maxEnd, presentLabel)
                        : '',
                    siteUrl: primary.siteUrl ?? '#',
                    // view-model field name kept as `logoUrl` (consumed by
                    // ExperienceItem.tsx) but sourced from the API's `backgroundUrl`.
                    logoUrl: primary.backgroundUrl
                        ? mediaSrc(primary.backgroundUrl)
                        : '',
                    roleTitle,
                    description,
                    cardTags,
                    positions,
                    missions,
                };
            })
    );
}

export function mapSkillCategory(dto: SkillCategoryDTO): SkillCategory {
    const translationsRecord = {} as SkillCategory['translations'];
    for (const t of dto.translations) {
        translationsRecord[t.locale as Locale] = { name: t.name };
    }

    const skills = dto.skills.map(skill => {
        const enTranslation = skill.translations.find(t => t.locale === 'en');
        const frTranslation = skill.translations.find(t => t.locale === 'fr');
        // image is nullable now (tag-migrated skills have no SVG yet).
        const logo = skill.image ? mediaSrc(skill.image) : '';
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
        imageUrl: mediaSrc(dto.imageUrl),
        redirectLink: dto.contactUrl,
        cssSize: dto.cssSize ?? 'auto',
    };
}
