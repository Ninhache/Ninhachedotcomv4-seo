import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { EducationDTO } from '../types';

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

export const EducationApi = {
    findAll: (): Promise<EducationDTO[]> => {
        return api
            .get('/education', { params: { raw: true } })
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to fetch educations'
                );
            });
    },

    create: (payload: any): Promise<EducationDTO> => {
        return api
            .post('/education', payload)
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to create education'
                );
            });
    },

    update: (id: string, payload: any): Promise<EducationDTO> => {
        return api
            .patch(`/education/${id}`, payload)
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to update education'
                );
            });
    },

    remove: (id: string): Promise<void> => {
        return api
            .delete(`/education/${id}`)
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to delete education'
                );
            });
    },

    patchVisibility: (
        id: string,
        isVisible: boolean
    ): Promise<EducationDTO> => {
        return api
            .patch(`/education/${id}/visibility`, { isVisible })
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to update education visibility'
                );
            });
    },
};
