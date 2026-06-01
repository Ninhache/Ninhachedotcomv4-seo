import axios from 'axios';
import { getSession } from 'next-auth/react';
import { baseUrl } from '../baseurl';
import type { ProjectDTO, ProjectMediaDTO } from '../types';

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

/** Separate instance for multipart uploads (no default Content-Type) */
const uploadApi = axios.create({
    baseURL: baseUrl,
});

uploadApi.interceptors.request.use(async config => {
    const session = await getSession();
    // @ts-ignore
    config.headers.Authorization = `Bearer ${session?.accessToken}`;
    return config;
});

function unwrap<T>(p: Promise<{ data: T }>) {
    return p
        .then(r => r.data)
        .catch(error => {
            throw new Error(error?.response?.data?.message || 'Request failed');
        });
}

export const ProjectApi = {
    findAll: (): Promise<ProjectDTO[]> =>
        unwrap(api.get<ProjectDTO[]>('/project')),

    findOne: (id: string): Promise<ProjectDTO> =>
        unwrap(api.get<ProjectDTO>(`/project/${id}`)),

    create: (payload: any): Promise<ProjectDTO> =>
        unwrap(api.post<ProjectDTO>('/project', payload)),

    update: (id: string, payload: any): Promise<ProjectDTO> =>
        unwrap(api.patch<ProjectDTO>(`/project/${id}`, payload)),

    remove: (id: string): Promise<void> => unwrap(api.delete(`/project/${id}`)),

    deleteMedia: (mediaId: string): Promise<void> =>
        unwrap(api.delete(`/media/${mediaId}`)),

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
