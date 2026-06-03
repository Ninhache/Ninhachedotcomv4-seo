'use client';

import type { AxiosInstance } from 'axios';
import { signOut } from 'next-auth/react';

// Guards against concurrent 401s triggering multiple sign-outs.
let signingOut = false;

/**
 * Attach a response interceptor that turns a backend 401 (expired/invalid
 * session token) into a clean re-login: clear the NextAuth session and redirect
 * to the admin login page, instead of letting the call fail silently with a
 * cryptic error. The admin login flow itself does not go through these axios
 * clients, so it can't trigger a loop.
 */
export function handleUnauthorized(api: AxiosInstance) {
    api.interceptors.response.use(
        response => response,
        error => {
            if (
                error?.response?.status === 401 &&
                !signingOut &&
                typeof window !== 'undefined'
            ) {
                signingOut = true;
                signOut({ callbackUrl: '/admin/login' });
            }
            return Promise.reject(error);
        }
    );
}
