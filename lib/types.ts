export type Locale = 'fr' | 'en';
export type ContractType =
    | 'Permanent'
    | 'Fixed'
    | 'Internship'
    | 'Workstudy'
    | 'Freelance';

// Project nature categories (formerly QUAL tags). Mirrors the backend
// `ProjectNature` enum and the keys of SORT_TYPE in lib/project-categories.ts.
export type ProjectNature =
    | 'SCHOOL'
    | 'PERSONAL'
    | 'WEB'
    | 'SIMULATIONS'
    | 'DATE'
    | 'RANDOM';

/* ---------------- TIMELINE: companies / missions / education ----------------
 * Front's copy of the backend timeline wire contract (GET /timeline and the
 * per-resource admin endpoints). Resync with the backend DTOs on any change.
 * GET returns full skill objects; POST/PATCH bodies use `skillIds` (the same
 * GET-vs-write asymmetry the Project DTO has). */

export type CompanyKind = 'EMPLOYER' | 'CLIENT';

// Per-locale editorial blurb for a company (GET returns full objects; the write
// payload reuses the same shape under `translations`).
export type CompanyTranslationDTO = {
    locale: Locale;
    description: string;
};

export type CompanyDTO = {
    id: string;
    kind: CompanyKind;
    name: string;
    localisation: string | null;
    siteUrl: string | null;
    // Large illustration image (« fond ») shown on the public experience card.
    backgroundUrl: string | null;
    // The company's actual logo — used by the standalone timeline app, not the
    // public site.
    logoUrl: string | null;
    isVisible: boolean;
    order: number;
    // Employer-only (null for CLIENT). employmentEnd null = current employer.
    contractType: ContractType | null;
    employmentStart: string | null; // ISO
    employmentEnd: string | null; // ISO
    // CLIENT-only: the employer this client was engaged through. Null for EMPLOYER.
    parentEmployerId: string | null;
    // EMPLOYER-level curated skills shown on the public card (GET returns full
    // objects; the write payload uses `skillIds`). Empty for clients/skill-less.
    skills?: SkillDTO[];
    skillIds?: string[];
    // Company's own translated blurb. GET returns full rows; the write payload
    // sends the same `translations` array (replace-on-update).
    translations?: CompanyTranslationDTO[];
};

export type MissionTranslationDTO = {
    locale: Locale;
    title: string;
    context: string | null;
    tasks: string[];
};

export type MissionDTO = {
    id: string;
    employerCompanyId: string;
    clientCompanyId: string | null;
    startDate: string; // ISO
    endDate: string | null; // ISO; null = ongoing
    isVisible: boolean;
    order: number;
    skills?: SkillDTO[];
    skillIds?: string[];
    // Optional illustration — a plain path/URL string (like Company.logoUrl).
    // '' on the write payload clears it.
    imageUrl?: string | null;
    translations: MissionTranslationDTO[];
};

export type PositionTranslationDTO = {
    locale: Locale;
    title: string;
};

// A job title held at an employer over a date range. Several positions under one
// employer express a title progression (e.g. Apprentice Dev → +DevOps → Engineer).
// Distinct from MissionDTO: a position carries no client/tags, only the evolving title.
export type PositionDTO = {
    id: string;
    companyId: string;
    startDate: string; // ISO
    endDate: string | null; // ISO; null = current position
    isVisible: boolean;
    order: number;
    translations: PositionTranslationDTO[];
};

export type EducationTranslationDTO = {
    locale: Locale;
    degree: string;
    description: string | null;
};

export type EducationDTO = {
    id: string;
    institutionName: string;
    startDate: string; // ISO
    endDate: string | null; // ISO
    logoUrl: string | null;
    siteUrl: string | null;
    isVisible: boolean;
    order: number;
    translations: EducationTranslationDTO[];
};

// One-shot payload of GET /timeline — built for the public site so it can render
// the whole "where I've worked" timeline (employers + their missions) from a
// single unauthenticated request. `educations` is consumed by the timeline SPA,
// not the public portfolio, but travels in the same response.
export type TimelinePayloadDTO = {
    companies: CompanyDTO[];
    missions: MissionDTO[];
    educations: EducationDTO[];
    positions: PositionDTO[];
};

export type MediaType = 'IMAGE' | 'VIDEO';

export type ProjectTranslationDTO = {
    locale: Locale;
    name: string;
    description: string;
};

export type ProjectMediaDTO = {
    id: string;
    mediaUrl: string;
    type: MediaType;
    alt?: string | null; // editable alt text (a11y/SEO)
    originalName?: string;
    mimeType?: string;
};

export type ProjectDTO = {
    id: string;
    startDate: string; // ISO
    endDate?: string | null; // ISO; null/absent = ongoing project
    /** @deprecated legacy single date — kept as a transition fallback until the back migration lands */
    date?: string; // ISO
    gitUrl?: string | null;
    visitUrl?: string | null;
    playUrl?: string | null;
    logoUrl?: string | null;
    isVisible: boolean;
    medias: ProjectMediaDTO[];
    // Tech stack = skills (GET returns full objects; write uses `skillIds`).
    skillIds: string[];
    skills: SkillDTO[];
    // Project nature(s) — formerly QUAL tags, now a scalar enum array.
    natures: ProjectNature[];
    translations: (ProjectTranslationDTO & { type?: string | null })[];
};

export type ProfileTranslationDTO = {
    locale: Locale;
    greeting: string;
    profession: string;
    description: string;
    // "Who am I?" intro paragraph. May contain a <projects>…</projects> tag that
    // the public site renders as a link to the projects section.
    introduction?: string;
};

export type ProfileDTO = {
    id: string;
    name: string;
    imageUrl?: string | null; // "Who am I?" portrait; editable in the back-office
    updatedAt: string;
    translations: ProfileTranslationDTO[];
};

export type ResumeTranslationDTO = {
    id: string;
    locale: Locale;
    url: string;
    resumeId: string;
};

export type ResumeDTO = {
    id: string;
    updatedAt: string; // ISO
    translations: ResumeTranslationDTO[];
};

export type SkillTranslationDTO = { id?: string; locale: Locale; name: string };
export type SkillCategoryTranslationDTO = {
    id?: string;
    locale: Locale;
    name: string;
};
export type SkillCategoryDTO = {
    id: string;
    isVisible: boolean;
    // Display order on the public portfolio (ascending). Defaults to 0 when the
    // backend predates the ordering feature — callers sort with `?? 0`.
    order: number;
    translations: SkillCategoryTranslationDTO[];
    // Returned pre-sorted by the per-category join order; array order IS the
    // skill display order within this category.
    skills: SkillDTO[];
};
export type SkillDTO = {
    id: string;
    // Nullable: skills migrated from the former TECH tag pool have no SVG yet.
    image: string | null;
    wikiUrl: string | null;
    isVisible: boolean;
    // Present only on the full admin/skills read; absent when a skill is embedded
    // as a tech chip on a project/mission/company.
    categories?: SkillCategoryDTO[];
    translations: SkillTranslationDTO[];
};

export type ContactTranslationDTO = {
    id?: string;
    locale: Locale;
    name: string;
};
export type ContactDTO = {
    id: string;
    contactUrl: string;
    imageUrl: string;
    isVisible: boolean;
    cssSize?: string | null;
    translations: ContactTranslationDTO[];
    nameByLocale: Record<Locale, string>;
};

// --- Aliases (back-office editor) ---------------------------------------
// Front's COPY of the backend alias contract. The front never executes these
// bodies; it only edits them. Resync with the backend on any contract change.
//
// Each body is JS source: last line = `return`; other aliases via `$.cle`;
// args via `$.args`. Execution happens ONLY on the backend (isolated VM).
export type AliasBody = {
    id?: string;
    locale: Locale;
    code: string;
};
export type Alias = {
    id: string;
    key: string; // slug
    bodies: AliasBody[];
};
