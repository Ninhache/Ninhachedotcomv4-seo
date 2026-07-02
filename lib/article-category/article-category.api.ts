import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { ArticleCategoryDTO } from '../types';

export type CreateArticleCategoryPayload = {
    slug: string;
    isVisible: boolean;
    order?: number;
    translations: { locale: string; name: string }[];
};
export type UpdateArticleCategoryPayload =
    Partial<CreateArticleCategoryPayload>;

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

/**
 * Admin CRUD client for blog categories (`ArticleCategory`). Mirrors
 * `CategoryApi` from `lib/skill/skill.api.ts`: `raw=true` on the admin list
 * endpoint (unresolved `@@` aliases), plus an atomic `reorder` for the
 * arrow-based ordering UI. Category↔article membership is authored on the
 * article side (`categoryIds`), not here.
 */
export const ArticleCategoryApi = {
    findAll: () =>
        unwrap(
            api.get<ArticleCategoryDTO[]>('/article-categories/admin', {
                params: { raw: true },
            })
        ),

    create: (
        payload: CreateArticleCategoryPayload
    ): Promise<ArticleCategoryDTO> =>
        unwrap(api.post<ArticleCategoryDTO>('/article-categories', payload)),

    update: (
        id: string,
        payload: UpdateArticleCategoryPayload
    ): Promise<ArticleCategoryDTO> =>
        unwrap(
            api.patch<ArticleCategoryDTO>(`/article-categories/${id}`, payload)
        ),

    remove: (id: string): Promise<void> =>
        unwrap(api.delete(`/article-categories/${id}`)),

    /**
     * Persist the display order of categories in a single atomic request.
     * Send the full ordered list; the backend assigns `order = index`.
     * @param items category ids paired with their new zero-based order
     */
    reorder: (items: { id: string; order: number }[]): Promise<void> =>
        unwrap(api.patch('/article-categories/reorder', { items })),
};
