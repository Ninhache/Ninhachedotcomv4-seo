import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { ModerationCommentDTO, ModerationReaderDTO } from '../types';

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
 * Back-office client for reader-authored content.
 *
 * Routes live under `/moderation`, not `/admin`: the API's `AdminController`
 * already owns `GET /admin/:id`, which would swallow `/admin/comments`.
 */
export const ModerationApi = {
    findComments: (): Promise<{
        items: ModerationCommentDTO[];
        total: number;
    }> => unwrap(api.get('/moderation/comments')),

    removeComment: (id: string): Promise<void> =>
        unwrap(api.delete(`/moderation/comments/${id}`)),

    findReaders: (): Promise<ModerationReaderDTO[]> =>
        unwrap(api.get('/moderation/readers')),

    setBanned: (id: string, isBanned: boolean): Promise<ModerationReaderDTO> =>
        unwrap(api.patch(`/moderation/readers/${id}`, { isBanned })),
};
