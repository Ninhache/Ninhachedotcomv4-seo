import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';

// Separate instance for multipart uploads (no default Content-Type so the
// browser sets the multipart boundary itself).
const uploadApi = axios.create({ baseURL: baseUrl });
uploadApi.interceptors.request.use(async config => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
handleUnauthorized(uploadApi);

/**
 * The single upload path shared by every admin form that carries an image
 * (Company.logoUrl, Skill.image, Mission.imageUrl, …). Pushes a file through
 * the back's `POST /media` endpoint and returns the stored `/uploads/...` path,
 * ready to drop straight into the owner's URL field (resolved client-side via
 * `mediaSrc`). Replaces the per-resource `uploadLogo`/`uploadMedia` copies.
 */
export const MediaApi = {
    upload: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const r = await uploadApi.post('/media', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return r.data.mediaUrl as string;
    },
};
