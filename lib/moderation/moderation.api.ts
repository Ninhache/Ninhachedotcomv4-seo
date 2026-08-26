import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type {
    ModerationCommentDTO,
    ModerationReaderDTO,
    ModerationReaderRowDTO,
} from '../types';

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

    findReaders: (): Promise<ModerationReaderRowDTO[]> =>
        unwrap(api.get('/moderation/readers')),

    setBanned: (id: string, isBanned: boolean): Promise<ModerationReaderDTO> =>
        unwrap(api.patch(`/moderation/readers/${id}`, { isBanned })),

    renameReader: (
        id: string,
        displayName: string
    ): Promise<ModerationReaderDTO> =>
        unwrap(api.patch(`/moderation/readers/${id}`, { displayName })),

    /** Wipes what one reader wrote, keeping the account. Returns how many. */
    removeReaderComments: (
        id: string
    ): Promise<{ id: string; count: number }> =>
        unwrap(api.delete(`/moderation/readers/${id}/comments`)),

    /**
     * Closes an account. Their comments stay up, orphaned, and the public side
     * renders them as coming from a deleted account: erasing the person is not
     * the same decision as erasing the discussion others took part in.
     */
    removeReader: (id: string): Promise<{ id: string }> =>
        unwrap(api.delete(`/moderation/readers/${id}`)),
};
