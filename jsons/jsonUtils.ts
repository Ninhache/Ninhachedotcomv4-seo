import { SortType } from "@/app/_components/project/projects";
import { Locale } from "@/config";

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
    date: string;
    translations: ProjectTranslations;
    tags: Tag[];
    links: outLink;
    videoUrl?: string;
    image: string;
    logo: string;
    sortCategories: SortType[];
}

export interface ExperienceTranslation {
    type: string;
    description: string;
    jobtitle: string;
}

export type ExperienceTranslations = Record<Locale, ExperienceTranslation>;

export interface Experience {
    title: string;
    date: string;
    translations: ExperienceTranslations;
    tags: Tag[];
    link: string;
    videoUrl?: string;
    image: string;
}

export interface Skill {
    name: string;
    logo: string;
    link: string;
}

export interface SkillCategoryTranslation {
    name: string;
}

export type SkillCategoryTranslations = Record<Locale, SkillCategoryTranslation>;

export interface SkillCategory {
    translations: SkillCategoryTranslations;
    skills: Skill[];
}