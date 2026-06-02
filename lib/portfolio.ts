import { baseUrl } from './baseurl';
import type {
    ContactDTO,
    ExperienceDTO,
    ProfileDTO,
    ProjectDTO,
    SkillCategoryDTO,
} from './types';

/**
 * Unauthenticated server-side read path for the public site.
 *
 * Each fetch is tagged so the backend can bust it precisely via /api/revalidate.
 * `revalidate` is long on purpose — freshness is driven by tag invalidation
 * (content edits + the hourly greeting cron), not by time.
 *
 * Resilient by design: a backend blip returns `fallback` instead of throwing, so
 * a page never 500s. With ISR, the last good version keeps being served while a
 * background regeneration recovers.
 */
async function fetchPublic<T>(
    path: string,
    tags: string[],
    fallback: T
): Promise<T> {
    try {
        const res = await fetch(`${baseUrl}${path}`, {
            next: { tags, revalidate: 86400 },
        });
        if (!res.ok) {
            console.warn(
                `Portfolio API error: ${res.status} on ${path} — serving fallback`
            );
            return fallback;
        }
        return (await res.json()) as T;
    } catch (err) {
        console.warn(
            `Portfolio API fetch failed on ${path} — serving fallback`,
            err
        );
        return fallback;
    }
}

// Cache-tag convention — MUST match the backend exactly: `<entity>` plus a
// variant per locale. One response carries both locales, so any locale-scoped
// invalidation busts the shared cache entry.
const localeTags = (entity: string) => [entity, `${entity}:fr`, `${entity}:en`];

export const getProjects = () =>
    fetchPublic<ProjectDTO[]>('/project', localeTags('projects'), []);

export const getExperiences = () =>
    fetchPublic<ExperienceDTO[]>('/experiences', localeTags('experiences'), []);

export const getSkillCategories = () =>
    fetchPublic<SkillCategoryDTO[]>(
        '/skill/categories',
        localeTags('skills'),
        []
    );

export const getContacts = () =>
    fetchPublic<ContactDTO[]>('/contact', localeTags('contacts'), []);

// Profile carries the hero greeting -> also tagged 'greeting' so the hourly cron
// busts it. Falls back to null (the page already guards `profile?.`).
export const getProfile = () =>
    fetchPublic<ProfileDTO | null>(
        '/profile',
        [...localeTags('profile'), 'greeting'],
        null
    );
