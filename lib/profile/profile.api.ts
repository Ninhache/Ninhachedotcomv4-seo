import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { ProfileDTO } from '../types';

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

export const ProfileApi = {
    // raw=true tells the back to return content with @@ aliases UNRESOLVED, so
    // the editor round-trips the literal tokens instead of freezing resolved
    // values. The public portfolio (lib/portfolio.ts) omits it -> resolved.
    get: (): Promise<ProfileDTO> =>
        api.get('/profile', { params: { raw: true } }).then(r => r.data),

    update: (
        payload: Partial<ProfileDTO> & { translations?: any[] }
    ): Promise<ProfileDTO> => api.patch('/profile', payload).then(r => r.data),
};
