import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { ArticleDTO } from '../types';

export type CreateArticlePayload = {
    slug: string;
    isVisible: boolean;
    publishedAt?: string | null;
    coverImageUrl?: string | null;
    tags?: string[];
    order?: number;
    categoryIds: string[];
    translations: {
        locale: string;
        title: string;
        excerpt: string;
        body: string;
    }[];
};
export type UpdateArticlePayload = Partial<CreateArticlePayload>;

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
 * Admin CRUD client for blog articles. Same GET-vs-write asymmetry as the
 * rest of the wire contract: the admin list (`raw=true`) returns full
 * `categories` objects, while create/update send `categoryIds`.
 */
export const ArticleApi = {
    findAll: () =>
        unwrap(
            api.get<ArticleDTO[]>('/articles/admin', {
                params: { raw: true },
            })
        ),

    create: (payload: CreateArticlePayload): Promise<ArticleDTO> =>
        unwrap(api.post<ArticleDTO>('/articles', payload)),

    update: (id: string, payload: UpdateArticlePayload): Promise<ArticleDTO> =>
        unwrap(api.patch<ArticleDTO>(`/articles/${id}`, payload)),

    remove: (id: string): Promise<void> =>
        unwrap(api.delete(`/articles/${id}`)),

    /**
     * Issues, or rotates, the article's private review link. Rotating
     * invalidates the URL already shared, which is how a link gets revoked
     * without unpublishing anything.
     */
    issuePreviewToken: (id: string): Promise<{ previewToken: string }> =>
        unwrap(
            api.post<{ previewToken: string }>(`/articles/${id}/preview-token`)
        ),

    /** Drops the review link: the shared URL 404s from then on. */
    revokePreviewToken: (id: string): Promise<{ previewToken: null }> =>
        unwrap(
            api.delete<{ previewToken: null }>(`/articles/${id}/preview-token`)
        ),
};
