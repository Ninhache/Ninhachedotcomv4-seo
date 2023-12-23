import { SortType } from "@/components/projects";

export interface Tag {
    name: string;
    url: string;
}

export interface outLink {
    redirect: string;
    git: string;
    play: string;
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
    website: string;
    videoUrl?: string;
    imagePath: string;
}