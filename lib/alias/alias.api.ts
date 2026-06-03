import axios from 'axios';
import { getSession } from 'next-auth/react';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { baseUrl } from '../baseurl';
import type { Alias } from '../types';

// Payload for create/update. The front never runs the body JS — it only ships
// the source to the backend, which validates and executes it in an isolate.
export type AliasPayload = {
    key: string;
    bodies: { locale: string; code: string }[];
};

const api = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async config => {
    const session = await getSession();
    const token = (session as { accessToken?: string } | null)?.accessToken;
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

export const AliasApi = {
    findAll: (): Promise<Alias[]> => unwrap(api.get<Alias[]>('/admin/aliases')),

    create: (payload: AliasPayload): Promise<Alias> =>
        unwrap(api.post<Alias>('/admin/aliases', payload)),

    update: (id: string, payload: AliasPayload): Promise<Alias> =>
        unwrap(api.patch<Alias>(`/admin/aliases/${id}`, payload)),

    remove: (id: string): Promise<void> =>
        unwrap(api.delete(`/admin/aliases/${id}`)),
};
