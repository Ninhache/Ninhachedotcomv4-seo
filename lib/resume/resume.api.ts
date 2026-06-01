import axios from 'axios';
import { getSession } from 'next-auth/react';
import { baseUrl } from '../baseurl';
import type { ResumeDTO } from '../types';

const api = axios.create({
    baseURL: baseUrl,
});

api.interceptors.request.use(async config => {
    const session = await getSession();
    // @ts-ignore
    config.headers.Authorization = `Bearer ${session?.accessToken}`;
    return config;
});

function unwrap<T>(p: Promise<{ data: T }>) {
    return p
        .then(r => r.data)
        .catch(error => {
            throw new Error(error?.response?.data?.message || 'Request failed');
        });
}

export const ResumeApi = {
    findCurrent: (): Promise<ResumeDTO> =>
        unwrap(api.get<ResumeDTO>('/resume')),

    upload: (frFile?: File, enFile?: File): Promise<ResumeDTO> => {
        const formData = new FormData();
        if (frFile) formData.append('fr', frFile);
        if (enFile) formData.append('en', enFile);
        return unwrap(
            api.post<ResumeDTO>('/resume', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
        );
    },
};
