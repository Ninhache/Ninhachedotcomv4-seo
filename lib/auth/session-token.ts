'use client';

import { getSession } from 'next-auth/react';

/**
 * Single source of truth for the admin bearer token, shared by every API
 * client's request interceptor.
 *
 * Why this exists: `getSession()` from next-auth performs a network round-trip
 * to `/api/auth/session` on EVERY call. Calling it inside each request
 * interceptor meant one session fetch per backend request — a page that fans
 * out several calls (e.g. the employer page's `Promise.all` of 4) produced a
 * storm of `/api/auth/session` hits. Here the token is cached in memory and
 * primed from the SessionProvider (see `primeAccessToken`), so interceptors
 * read it without touching the network; concurrent cold reads share a single
 * in-flight `getSession()` instead of each firing their own.
 */

type Cached = { token: string; at: number };

let cached: Cached | null = null;
let inflight: Promise<string | null> | null = null;

// The access token is a long-lived JWT that only changes on re-login (which
// remounts the app). Cache generously; `primeAccessToken` refreshes it the
// instant the SessionProvider observes a new session, so staleness never bites.
const TTL_MS = 5 * 60 * 1000;

/**
 * Seed the cache from a known-good session (the SessionProvider context). Only
 * real tokens are stored — never cache an absent token as "fresh", or a request
 * fired during the brief loading window would be cached tokenless.
 */
export function primeAccessToken(token: string | null | undefined): void {
    if (token) cached = { token, at: Date.now() };
}

/** Drop the cached token (call on logout / 401 so the next read re-fetches). */
export function clearAccessToken(): void {
    cached = null;
    inflight = null;
}

/**
 * Current bearer token, served from cache when warm, otherwise a single shared
 * `getSession()` fetch (concurrent callers await the same promise).
 */
export async function getAccessToken(): Promise<string | null> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.token;
    if (inflight) return inflight;

    inflight = getSession()
        .then(session => {
            const token =
                (session as { accessToken?: string } | null)?.accessToken ??
                null;
            if (token) cached = { token, at: Date.now() };
            inflight = null;
            return token;
        })
        .catch(error => {
            inflight = null;
            throw error;
        });

    return inflight;
}
