import axios from 'axios';
import { handleUnauthorized } from '../auth/on-unauthorized';
import { getAccessToken } from '../auth/session-token';
import { baseUrl } from '../baseurl';
import type {
    CvConfigDTO,
    CvGenerateResultDTO,
    CvInventoryDTO,
    CvSelection,
    GenerateCvDTO,
    Locale,
} from '../types';

const api = axios.create({ baseURL: baseUrl });

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
            // Generation failures carry the Tectonic log — surface it.
            const data = error?.response?.data;
            const message =
                (data?.log
                    ? `${data.message ?? 'Compilation failed'}\n\n${data.log}`
                    : data?.message) || 'Request failed';
            throw new Error(message);
        });
}

export const CvApi = {
    /** Selectable inventory (ids + labels) for the builder checkboxes. */
    getData: (locale: Locale): Promise<CvInventoryDTO> =>
        unwrap(api.get<CvInventoryDTO>('/cv/data', { params: { locale } })),

    /** Current persisted template + selection + last generated URLs. */
    getConfig: (): Promise<CvConfigDTO> =>
        unwrap(api.get<CvConfigDTO>('/cv/config')),

    /** Persist the template + selection chosen in the builder. */
    saveConfig: (body: {
        template?: string;
        selection?: CvSelection;
    }): Promise<CvConfigDTO> =>
        unwrap(api.put<CvConfigDTO>('/cv/config', body)),

    /** Generate the CV PDF(s). Throws with the LaTeX log on failure. */
    generate: (body: GenerateCvDTO): Promise<CvGenerateResultDTO> =>
        unwrap(api.post<CvGenerateResultDTO>('/cv/generate', body)),
};
