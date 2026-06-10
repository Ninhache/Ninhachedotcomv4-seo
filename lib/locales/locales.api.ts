import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';

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

export const LocalesApi = {
    findAll: () => {
        return api
            .get('/locales')
            .then(response => response.data)
            .catch(error => {
                throw new Error(
                    error.response?.data?.message || 'Failed to fetch locales'
                );
            });
    },
};
