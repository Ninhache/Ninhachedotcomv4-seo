import axios from 'axios';
import { getSession } from 'next-auth/react';
import { baseUrl } from '../baseurl';
import type { ProfileDTO } from '../types';

const api = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async config => {
    const session = await getSession();
    // @ts-ignore
    config.headers.Authorization = `Bearer ${session?.accessToken}`;
    return config;
});

export const ProfileApi = {
    get: (): Promise<ProfileDTO> => api.get('/profile').then(r => r.data),

    update: (
        payload: Partial<ProfileDTO> & { translations?: any[] }
    ): Promise<ProfileDTO> => api.patch('/profile', payload).then(r => r.data),
};
