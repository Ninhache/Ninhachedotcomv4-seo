import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { SkillCategoryDTO, SkillDTO } from '../types';

export type CreateSkillPayload = {
    // Optional since the Skill/Tag merge — skills migrated from the former TECH
    // tag pool have no SVG icon yet. `null` explicitly clears an existing icon
    // (an omitted/undefined field is left unchanged by the PATCH).
    image?: string | null;
    wikiUrl?: string;
    isVisible: boolean;
    categoryIds: string[];
    translations: { locale: string; name: string }[];
};
export type UpdateSkillPayload = Partial<CreateSkillPayload>;

const api = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async config => {
    const token = await getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

handleUnauthorized(api);

function unwrap<T>(p: Promise<{ data: T }>) {
    return p
        .then(r => r.data)
        .catch(error => {
            throw new Error(error?.response?.data?.message || 'Request failed');
        });
}

export type CategoryPayload = {
    isVisible: boolean;
    translations: { locale: string; name: string }[];
    skillIds?: string[];
};

export const SkillApi = {
    // raw=true -> editor gets @@ aliases unresolved (public portfolio omits it).
    findAll: () =>
        unwrap(api.get<SkillDTO[]>('/skill', { params: { raw: true } })),

    create: (payload: CreateSkillPayload): Promise<SkillDTO> =>
        unwrap(api.post<SkillDTO>('/skill', payload)),

    update: (id: string, payload: UpdateSkillPayload): Promise<SkillDTO> =>
        unwrap(api.patch<SkillDTO>(`/skill/${id}`, payload)),

    remove: (id: string): Promise<void> => unwrap(api.delete(`/skill/${id}`)),
};

export const CategoryApi = {
    findAll: () =>
        unwrap(
            api.get<SkillCategoryDTO[]>('/skill/categories/admin', {
                params: { raw: true },
            })
        ),

    create: (payload: CategoryPayload): Promise<SkillCategoryDTO> =>
        unwrap(api.post<SkillCategoryDTO>('/skill/categories', payload)),

    update: (
        id: string,
        payload: Partial<CategoryPayload>
    ): Promise<SkillCategoryDTO> =>
        unwrap(api.patch<SkillCategoryDTO>(`/skill/categories/${id}`, payload)),

    remove: (id: string): Promise<void> =>
        unwrap(api.delete(`/skill/categories/${id}`)),

    /**
     * Persist the display order of categories in a single atomic request.
     * Send the full ordered list; the backend assigns `order = index`.
     * @param items category ids paired with their new zero-based order
     */
    reorder: (items: { id: string; order: number }[]): Promise<void> =>
        unwrap(api.patch('/skill/categories/reorder', { items })),
};
