import { SortType } from "@/components/project/projects";

export interface Tag {
    name: string;
    url: string;
}

export interface outLink {
    redirect: string;
    git: string;
    play: string; // String can be "none" since we're loading them using a JSON
}

export interface Project {
    date: string;
    type: string;
    title: string;
    description: string;
    tags: Tag[];
    links: outLink;
    videoUrl?: string;
    image: string;
    logo: string;
    sortCategories: SortType[];
}

export interface Experience {
    date: string;
    type: string;
    title: string;
    description: string;
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

export interface SkillCategory {
    name: string;
    skills: Skill[];
}