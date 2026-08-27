'use client';

import { baseUrl } from '../baseurl';
import type { Locale } from '../types';

export const REACTION_KINDS = ['like', 'love', 'insightful', 'funny'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const READER_PROVIDERS = ['google', 'github', 'discord'] as const;
export type ReaderProvider = (typeof READER_PROVIDERS)[number];

/** How each provider spells its own name. Not translated: brands are not. */
export const PROVIDER_LABEL: Record<ReaderProvider, string> = {
    google: 'Google',
    github: 'GitHub',
    discord: 'Discord',
};

/*
 * Mirrors `reader.constants.ts` on the API. Duplicated on purpose rather than
 * fetched: these two numbers only shape the input hint and the disabled state,
 * and the API remains the one that decides. If they ever drift, the field lets
 * something through and the server refuses it with its own message.
 */
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 32;

/**
 * What the API exposes publicly about a reader. Never carries their email.
 *
 * `displayName` is nullable because a reader exists from the moment they sign
 * in, before they have chosen the name they publish under. Nothing they write
 * can reach a public response in that state, so a null here in practice only
 * shows up in `/reader/me`.
 */
export type PublicReader = {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    provider: ReaderProvider;
};

/**
 * What `/reader/me` adds, and only there: this shape describes the person
 * asking, never somebody else. `suggestedName` is what the provider handed
 * back, which is very often a real first and last name, so it travels to that
 * person alone and is never published on their behalf.
 */
export type SelfReader = PublicReader & {
    suggestedName: string;
    /** True until a name is chosen. Blocks commenting and reacting. */
    needsName: boolean;
    createdAt: string;
};

export type CommentDTO = {
    id: string;
    body: string;
    locale: Locale;
    createdAt: string; // ISO
    /** Null on a thread root, the id of the answered message otherwise. */
    parentId: string | null;
    /** Null once the author deleted their account: the message stays, they go. */
    reader: PublicReader | null;
    /** Direct answers to this comment, oldest first, nested the same way. */
    replies: CommentDTO[];
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
    me: () => request<{ reader: SelfReader | null }>('/reader/me'),

    logout: () => request<void>('/reader/logout', { method: 'POST' }),

    updateName: (displayName: string) =>
        request<{ reader: SelfReader }>('/reader/me', {
            method: 'PATCH',
            body: JSON.stringify({ displayName }),
        }),

    exportMe: () => request<ReaderExport>('/reader/me/export'),

    deleteAccount: () => request<void>('/reader/me', { method: 'DELETE' }),

    findComments: (articleId: string) =>
        request<{ items: CommentDTO[]; total: number }>(
            `/articles/${articleId}/comments`
        ),

    createComment: (
        articleId: string,
        body: string,
        locale: Locale,
        parentId?: string
    ) =>
        request<CommentDTO>(`/articles/${articleId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body, locale, parentId }),
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

/**
 * Everything the API keeps about the reader asking, as returned by the export
 * route. Typed loosely on purpose: it is data to show and to save, not data to
 * branch on, and pinning every field here would mean editing two files each
 * time a column is added to the export.
 */
export type ReaderExport = {
    exportedAt: string;
    account: {
        id: string;
        provider: ReaderProvider;
        providerAccountId: string;
        providerName: string;
        displayName: string | null;
        avatarUrl: string | null;
        email: string | null;
        createdAt: string;
    };
    comments: unknown[];
    reactions: unknown[];
};

/**
 * Saves an already-fetched export to a file.
 *
 * The account page fetches the export to show what is stored, so the download
 * reuses that payload instead of asking the API a second time for bytes it is
 * already holding. The API still sets `Content-Disposition`, which keeps the
 * route usable on its own from a terminal.
 */
export function downloadExport(payload: ReaderExport): void {
    const day = payload.exportedAt.slice(0, 10);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `ninhache-donnees-${day}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
}
