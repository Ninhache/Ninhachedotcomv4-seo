import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { ResumeDTO } from '../types';

const api = axios.create({
    baseURL: baseUrl,
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
