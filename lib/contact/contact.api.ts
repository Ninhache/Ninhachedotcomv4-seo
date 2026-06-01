import axios from 'axios';
import { getSession } from 'next-auth/react';
import { baseUrl } from '../baseurl';
import { ContactDTO } from '../types';

export type CreateContactPayload = {
    contactUrl: string;
    imageUrl: string;
    isVisible: boolean;
    translations: { locale: string; name: string }[];
};
export type UpdateContactPayload = Partial<CreateContactPayload>;

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

export const ContactApi = {
    findAll: () => unwrap(api.get<ContactDTO[]>('/contact')),

    create: (payload: CreateContactPayload): Promise<ContactDTO> =>
        unwrap(api.post<ContactDTO>('/contact', payload)),

    update: (id: string, payload: UpdateContactPayload): Promise<ContactDTO> =>
        unwrap(api.patch<ContactDTO>(`/contact/${id}`, payload)),

    remove: (id: string): Promise<void> => unwrap(api.delete(`/contact/${id}`)),
};
