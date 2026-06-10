import { Locale } from '@/config';
import { SortType } from '@/lib/project-categories';

export interface Tag {
    name: string;
    url: string;
}

export interface outLink {
    redirect: string;
    git: string;
    play: string; // String can be "none" since we're loading them using a JSON
}

export interface ProjectTranslation {
    description: string;
    type: string;
}

export type ProjectTranslations = Record<Locale, ProjectTranslation>;

export interface Project {
    title: string;
    date: string; // display label: "MM/YYYY - MM/YYYY" or "depuis plus de X ans"
    startDate: string; // ISO — used for sorting
    endDate?: string; // ISO — set only for finished projects; used for sorting
    ongoing: boolean; // no end date => actively in development
    translations: ProjectTranslations;
    tags: Tag[];
    links: outLink;
    videoUrl?: string;
    image: string;
    logo: string;
    sortCategories: SortType[];
}

// View-models for the public "where I've worked" mini-timeline. Built from the
// unified Company/Mission model (GET /timeline) by `mapTimelineToEmployers`,
// already locale-resolved server-side — no per-locale translation maps here.
export interface MissionView {
    title: string;
    context: string; // localized; '' when the locale has no context
    tasks: string[]; // localized task bullets; [] when none
    date: string; // display label: "Jan 2024 - Mar 2025" / "Jan 2024 - Present"
    start: string; // ISO — used to group a mission under the role(s) it spans
    end: string | null; // ISO, or null when ongoing
    client: string; // client company name; '' for in-house missions (no client)
    clientDescription: string; // the client company's OWN blurb; '' if none / in-house
    location: string; // client's localisation at-client, else the employer's; '' if none
    logoUrl: string; // client logo when at-client, else the employer logo; '' if none
    tags: Tag[];
}

// One step of an employer-level job-title progression (e.g. PIT: Apprentice
// Dev → +DevOps → Engineer). A single-entry array means a mono-role employer.
export interface PositionView {
    title: string; // localized job title
    date: string; // period label: "Sep 2024 - Sep 2025" / "Sep 2024 - Present"
    start: string; // ISO — used to match missions falling within this role
    end: string | null; // ISO, or null when ongoing (the current role)
    current: boolean; // true when open-ended (endDate null) — the active title
}

export interface EmployerWithMissions {
    companyName: string;
    contractType: string; // localized contract label; '' when absent
    date: string; // employer-level period label
    siteUrl: string; // '#' when none
    logoUrl: string; // '' when none — also the card's screenshot/visual
    roleTitle: string; // current/most-recent job title; '' when no positions
    description: string; // card blurb: the in-house mission's context; '' when none
    cardTags: Tag[]; // unique tech tags across the employer's missions
    positions: PositionView[]; // title progression, chronological; [] when none
    missions: MissionView[];
}

export interface Skill {
    name: string;
    logo: string;
    link: string;
}

export interface SkillCategoryTranslation {
    name: string;
}

export type SkillCategoryTranslations = Record<
    Locale,
    SkillCategoryTranslation
>;

export interface SkillCategory {
    translations: SkillCategoryTranslations;
    skills: Skill[];
}
