import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { CompanyDTO, CompanyKind } from '../types';

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

export const CompanyApi = {
    findAll: (
        kind?: CompanyKind,
        parentEmployerId?: string
    ): Promise<CompanyDTO[]> => {
        return api
            .get('/companies', {
                params: {
                    raw: true,
                    ...(kind ? { kind } : {}),
                    ...(parentEmployerId ? { parentEmployerId } : {}),
                },
            })
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to fetch companies'
                );
            });
    },

    findOne: (id: string): Promise<CompanyDTO> => {
        return api
            .get(`/companies/${id}`)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to fetch company'
                );
            });
    },

    create: (payload: any): Promise<CompanyDTO> => {
        return api
            .post('/companies', payload)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to create company'
                );
            });
    },

    update: (id: string, payload: any): Promise<CompanyDTO> => {
        return api
            .patch(`/companies/${id}`, payload)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to update company'
                );
            });
    },

    remove: (id: string): Promise<void> => {
        return api
            .delete(`/companies/${id}`)
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to delete company'
                );
            });
    },

    patchVisibility: (id: string, isVisible: boolean): Promise<CompanyDTO> => {
        return api
            .patch(`/companies/${id}/visibility`, { isVisible })
            .then(r => r.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to update company visibility'
                );
            });
    },
};
