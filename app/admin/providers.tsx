'use client';

import type { Session } from 'next-auth';
import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { primeAccessToken } from '@/lib/auth/session-token';

/**
 * Keeps the shared API-token cache in sync with the NextAuth session, so the
 * axios request interceptors read the bearer token from memory instead of each
 * firing their own `/api/auth/session` fetch.
 */
function TokenPrimer() {
    const { data } = useSession();
    useEffect(() => {
        primeAccessToken(
            (data as { accessToken?: string } | null)?.accessToken
        );
    }, [data]);
    return null;
}

export default function Providers({
    children,
    session,
}: {
    children: React.ReactNode;
    session?: Session | null;
}) {
    // refetchOnWindowFocus disabled: the access token is a long-lived JWT, so
    // re-hitting /api/auth/session on every tab focus is pure noise.
    return (
        <SessionProvider session={session} refetchOnWindowFocus={false}>
            <TokenPrimer />
            {children}
        </SessionProvider>
    );
}
