'use client';

import { baseUrl } from '../baseurl';
import type { Locale } from '../types';

export const REACTION_KINDS = ['like', 'love', 'insightful', 'funny'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const READER_PROVIDERS = ['google', 'github', 'discord'] as const;
export type ReaderProvider = (typeof READER_PROVIDERS)[number];

/** What the API exposes publicly about a reader. Never carries their email. */
export type PublicReader = {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    provider: ReaderProvider;
};

export type CommentDTO = {
    id: string;
    body: string;
    locale: Locale;
    createdAt: string; // ISO
    reader: PublicReader;
};

export type ReactionSummary = {
    counts: Record<ReactionKind, number>;
    /** The kinds the current reader picked. Empty when nobody is signed in. */
    mine: ReactionKind[];
};

/**
 * Browser client for reader-facing endpoints.
 *
 * Deliberately native `fetch` and not the admin axios instance: that one
 * injects the NextAuth bearer token, which has nothing to do with this identity
 * and must not travel to these routes. What matters here is
 * `credentials: 'include'`, which sends the API's own reader cookie.
 *
 * `ninhache.fr` and `api.ninhache.fr` share a registrable domain, so that
 * cookie is same-site and needs no `SameSite=None`.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message || `HTTP ${response.status}`);
    }
    return response.status === 204
        ? (undefined as T)
        : ((await response.json()) as T);
}

/**
 * Full-page navigation that starts an OAuth flow. Not a fetch: a provider
 * consent screen needs a top-level navigation.
 */
export function loginUrl(provider: ReaderProvider, returnTo: string) {
    return `${baseUrl}/reader/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
}

export const ReaderApi = {
    me: () => request<{ reader: PublicReader | null }>('/reader/me'),

    logout: () => request<void>('/reader/logout', { method: 'POST' }),

    findComments: (articleId: string) =>
        request<{ items: CommentDTO[]; total: number }>(
            `/articles/${articleId}/comments`
        ),

    createComment: (articleId: string, body: string, locale: Locale) =>
        request<CommentDTO>(`/articles/${articleId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body, locale }),
        }),

    removeComment: (id: string) =>
        request<void>(`/comments/${id}`, { method: 'DELETE' }),

    findReactions: (articleId: string) =>
        request<ReactionSummary>(`/articles/${articleId}/reactions`),

    toggleReaction: (articleId: string, kind: ReactionKind) =>
        request<ReactionSummary>(`/articles/${articleId}/reactions/${kind}`, {
            method: 'PUT',
        }),
};
