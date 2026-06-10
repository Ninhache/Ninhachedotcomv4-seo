import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { PositionDTO } from '../types';

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async config => {
    const token = await getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

handleUnauthorized(api);

export const PositionApi = {
    /**
     * Fetch positions (raw=true so @@ aliases stay unresolved, consistent with
     * the other admin GET calls). Optionally scope to one employer company.
     */
    findAll: (params?: { companyId?: string }): Promise<PositionDTO[]> => {
        return api
            .get('/positions', {
                params: {
                    raw: true,
                    ...(params?.companyId
                        ? { companyId: params.companyId }
                        : {}),
                },
            })
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to fetch positions'
                );
            });
    },

    create: (payload: any): Promise<PositionDTO> => {
        return api
            .post('/positions', payload)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to create position'
                );
            });
    },

    update: (id: string, payload: any): Promise<PositionDTO> => {
        return api
            .patch(`/positions/${id}`, payload)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to update position'
                );
            });
    },

    remove: (id: string): Promise<void> => {
        return api
            .delete(`/positions/${id}`)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to delete position'
                );
            });
    },

    /**
     * Toggle visibility via the dedicated endpoint (avoids resending the whole
     * position payload just to flip one boolean).
     */
    patchVisibility: (id: string, isVisible: boolean): Promise<PositionDTO> => {
        return api
            .patch(`/positions/${id}/visibility`, { isVisible })
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to update position visibility'
                );
            });
    },
};
