import axios from 'axios';
import { getSession } from 'next-auth/react';
import { baseUrl } from '../baseurl';

const api = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async config => {
    const session = await getSession();
    // @ts-ignore
    config.headers.Authorization = `Bearer ${session?.accessToken}`;

    return config;
});

export const ExperienceApi = {
    findAll: (query: string = '') => {
        // raw=true -> editor gets @@ aliases unresolved (public portfolio omits it).
        return api
            .get('/experiences', { params: { raw: true } })
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to fetch experiences'
                );
            });
    },

    update: (id: string, payload: any) => {
        return api
            .patch(`/experiences/${id}`, payload)
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to update experiences'
                );
            });
    },

    create: (payload: any) => {
        return api
            .post(`/experiences`, payload)
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to create experience'
                );
            });
    },

    remove: (id: string) => {
        return api
            .delete(`/experiences/${id}`)
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message ||
                        'Failed to delete experience'
                );
            });
    },
};
