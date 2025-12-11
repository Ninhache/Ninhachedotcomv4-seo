import { getSession } from 'next-auth/react'
import { baseUrl } from '../baseurl'
import axios from 'axios'
import { TagDTO } from '../types'

export type CreateTagPayload = {
  type: 'TECH' | 'QUAL' | 'SKILL_CATEGORY' | 'EXPERIENCE_TECH'
  isVisible: boolean
  hexColor: string
  translations: { locale: string; name: string }[]
}

const api = axios.create({
  baseURL: baseUrl,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  const token = (session as any)?.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function unwrap<T>(p: Promise<{ data: T }>) {
  return p
    .then((r) => r.data)
    .catch((error) => {
      throw new Error(error?.response?.data?.message || 'Request failed')
    })
}

export const TagApi = {
  findAll: () => unwrap(api.get('/tag')),

  listExperienceTags: (params?: { locale?: string; q?: string; visibleOnly?: boolean }) =>
    unwrap(
      api.get<TagDTO[]>('/tags', {
        params: {
          // type: "EXPERIENCE_TECH",
          // visibleOnly: params?.visibleOnly ?? true,
          // locale: params?.locale,
          // q: params?.q,
        },
      }),
    ),

  create: (payload: CreateTagPayload): Promise<TagDTO> =>
    unwrap(api.post<TagDTO>('/tags', payload)),
}
