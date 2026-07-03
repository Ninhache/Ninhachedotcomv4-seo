import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { MissionDTO } from '../types';

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

export const MissionApi = {
    /**
     * Fetch all missions (raw=true so @@ aliases are unresolved, consistent
     * with other admin GET calls). Optionally scope to one employer and/or one
     * client company.
     */
    findAll: (params?: {
        employerCompanyId?: string;
        clientCompanyId?: string;
    }): Promise<MissionDTO[]> => {
        return api
            .get('/missions', {
                params: {
                    raw: true,
                    ...(params?.employerCompanyId
                        ? { employerCompanyId: params.employerCompanyId }
                        : {}),
                    ...(params?.clientCompanyId
                        ? { clientCompanyId: params.clientCompanyId }
                        : {}),
                },
            })
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to fetch missions'
                );
            });
    },

    create: (payload: any): Promise<MissionDTO> => {
        return api
            .post('/missions', payload)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to create mission'
                );
            });
    },

    update: (id: string, payload: any): Promise<MissionDTO> => {
        return api
            .patch(`/missions/${id}`, payload)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to update mission'
                );
            });
    },

    remove: (id: string): Promise<void> => {
        return api
            .delete(`/missions/${id}`)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to delete mission'
                );
            });
    },

    /**
     * Toggle visibility via the dedicated endpoint (avoids having to resend
     * the full mission payload just to flip one boolean).
     */
    patchVisibility: (id: string, isVisible: boolean): Promise<MissionDTO> => {
        return api
            .patch(`/missions/${id}/visibility`, { isVisible })
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to update mission visibility'
                );
            });
    },
};
