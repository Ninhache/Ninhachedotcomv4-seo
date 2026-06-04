export type Locale = 'fr' | 'en';
export type ContractType =
    | 'Permanent'
    | 'Fixed'
    | 'Internship'
    | 'Workstudy'
    | 'Freelance';

export type ExperienceTranslationDTO = {
    locale: Locale;
    jobTitle: string;
    description: string;
};

export type ExperienceDTO = {
    id: string;
    startDate: string; // ISO
    endDate: string; // ISO
    contractType: ContractType;
    localisation: string;
    isVisible: boolean;
    siteUrl?: string | null;
    imageUrl?: string | null;
    order: number;
    companyName: string;
    // GET response returns full tag objects; POST/PATCH body uses tagIds
    tags?: (TagDTO & { translations: TagTranslationDTO[] })[];
    tagIds?: string[];
    translations: ExperienceTranslationDTO[];
};

export type TagTranslationDTO = {
    id?: string;
    locale: Locale;
    name: string;
};

export type TagDTO = {
    id: string;
    type: 'TECH' | 'QUAL' | 'SKILL_CATEGORY' | 'EXPERIENCE_TECH';
    isVisible: boolean;
    hexColor: string;
    nameByLocale: Record<Locale, string>; // dérivé de TagTranslation
    translations?: TagTranslationDTO[];
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
    techTagIds: string[];
    qualTagIds: string[];
    techTags: (TagDTO & { translations: TagTranslationDTO[] })[];
    qualTags: (TagDTO & { translations: TagTranslationDTO[] })[];
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
    translations: SkillCategoryTranslationDTO[];
    skills: SkillDTO[];
};
export type SkillDTO = {
    id: string;
    image: string;
    wikiUrl: string | null;
    isVisible: boolean;
    tags: TagDTO[];
    categories: SkillCategoryDTO[];
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
