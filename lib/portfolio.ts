import { baseUrl } from './baseurl';
import type {
    ContactDTO,
    ExperienceDTO,
    ProfileDTO,
    ProjectDTO,
    SkillCategoryDTO,
} from './types';

async function fetchPublic<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
        next: { revalidate: 3600 },
    });
    if (!res.ok)
        throw new Error(`Portfolio API error: ${res.status} on ${path}`);
    return res.json() as Promise<T>;
}

export const getProjects = () => fetchPublic<ProjectDTO[]>('/project');
export const getExperiences = () =>
    fetchPublic<ExperienceDTO[]>('/experiences');
export const getSkillCategories = () =>
    fetchPublic<SkillCategoryDTO[]>('/skill/categories');
export const getContacts = () => fetchPublic<ContactDTO[]>('/contact');
export const getProfile = () => fetchPublic<ProfileDTO>('/profile');
