import axios from 'axios';
import { getSession } from 'next-auth/react';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { baseUrl } from '../baseurl';
import type { SkillCategoryDTO, SkillDTO } from '../types';

export type CreateSkillPayload = {
    image: string;
    wikiUrl?: string;
    isVisible: boolean;
    tagIds: string[];
    categoryIds: string[];
    translations: { locale: string; name: string }[];
};
export type UpdateSkillPayload = Partial<CreateSkillPayload>;

const api = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async config => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
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
};
