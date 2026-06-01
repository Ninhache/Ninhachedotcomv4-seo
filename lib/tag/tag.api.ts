import axios from 'axios';
import { getSession } from 'next-auth/react';
import { baseUrl } from '../baseurl';
import { TagDTO } from '../types';

export type CreateTagPayload = {
    type: 'TECH' | 'QUAL' | 'SKILL_CATEGORY' | 'EXPERIENCE_TECH';
    isVisible: boolean;
    hexColor: string;
    translations: { locale: string; name: string }[];
};
export type UpdateTagPayload = CreateTagPayload;

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

function unwrap<T>(p: Promise<{ data: T }>) {
    return p
        .then(r => r.data)
        .catch(error => {
            throw new Error(error?.response?.data?.message || 'Request failed');
        });
}

export const TagApi = {
    findAll: (params?: { q?: string; type?: string }) =>
        unwrap(
            api.get<TagDTO[]>('/tags', {
                params,
            })
        ),

    listExperienceTags: (params?: {
        locale?: string;
        q?: string;
        visibleOnly?: boolean;
    }) => {
        const query: Record<string, string | boolean> = {
            type: 'EXPERIENCE_TECH',
        };
        if (params?.locale) query.locale = params.locale;
        if (params?.q) query.q = params.q;
        if (typeof params?.visibleOnly === 'boolean')
            query.visibleOnly = params.visibleOnly;
        return unwrap(api.get<TagDTO[]>('/tags', { params: query }));
    },

    create: (payload: CreateTagPayload): Promise<TagDTO> =>
        unwrap(api.post<TagDTO>('/tags', payload)),

    update: (id: string, payload: UpdateTagPayload): Promise<TagDTO> =>
        unwrap(api.patch<TagDTO>(`/tags/${id}`, payload)),

    remove: (id: string): Promise<void> => unwrap(api.delete(`/tags/${id}`)),

    // Backend has no dedicated /visibility route; UpdateTagDto is a PartialType,
    // so a partial PATCH on the resource is the supported way to toggle visibility.
    patchVisibility: (id: string, isVisible: boolean): Promise<TagDTO> =>
        unwrap(api.patch<TagDTO>(`/tags/${id}`, { isVisible })),
};
