import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type { ProjectDTO, ProjectMediaDTO } from '../types';

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

/** Separate instance for multipart uploads (no default Content-Type) */
const uploadApi = axios.create({
    baseURL: baseUrl,
});

uploadApi.interceptors.request.use(async config => {
    const token = await getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

handleUnauthorized(api);
handleUnauthorized(uploadApi);

function unwrap<T>(p: Promise<{ data: T }>) {
    return p
        .then(r => r.data)
        .catch(error => {
            throw new Error(error?.response?.data?.message || 'Request failed');
        });
}

export const ProjectApi = {
    // raw=true -> back returns @@ aliases unresolved (for editing). Public
    // portfolio omits it and gets resolved content.
    findAll: (): Promise<ProjectDTO[]> =>
        unwrap(api.get<ProjectDTO[]>('/project', { params: { raw: true } })),

    findOne: (id: string): Promise<ProjectDTO> =>
        unwrap(
            api.get<ProjectDTO>(`/project/${id}`, { params: { raw: true } })
        ),

    create: (payload: any): Promise<ProjectDTO> =>
        unwrap(api.post<ProjectDTO>('/project', payload)),

    update: (id: string, payload: any): Promise<ProjectDTO> =>
        unwrap(api.patch<ProjectDTO>(`/project/${id}`, payload)),

    remove: (id: string): Promise<void> => unwrap(api.delete(`/project/${id}`)),

    deleteMedia: (mediaId: string): Promise<void> =>
        unwrap(api.delete(`/media/${mediaId}`)),

    // Persist editable media metadata (alt text). Backend must accept `alt` on
    // PATCH /media/:id (see UpdateMediaDto).
    updateMedia: (
        mediaId: string,
        payload: { alt?: string | null }
    ): Promise<ProjectMediaDTO> =>
        unwrap(api.patch<ProjectMediaDTO>(`/media/${mediaId}`, payload)),

    uploadMedia: (
        file: File,
        type?: 'IMAGE' | 'VIDEO',
        projectId?: string
    ): Promise<ProjectMediaDTO> => {
        const formData = new FormData();
        formData.append('file', file);
        if (type) formData.append('type', type);
        if (projectId) formData.append('projectId', projectId);
        return unwrap(
            uploadApi.post<ProjectMediaDTO>('/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
        );
    },
};
