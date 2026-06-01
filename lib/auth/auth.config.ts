import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginService } from '@/lib/auth/auth.service';

interface ExtendedUser {
    id: string;
    name?: string | null;
    email?: string | null;
    accessToken?: string;
}

interface ExtendedSession {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    expires: string;
    accessToken?: string;
}

interface ExtendedJWT {
    accessToken?: string;
    [key: string]: unknown;
}

export const authOptions: NextAuthOptions = {
    // Required in production to sign/verify the session JWT. Set NEXTAUTH_SECRET.
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        Credentials({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials) {
                    throw new Error('Credentials are not sets');
                }

                const { username: email, password } = credentials;
                const { access_token } = await LoginService.loginCredentials(
                    email,
                    password
                );

                if (access_token) {
                    return {
                        id: email,
                        name: email,
                        email: email,
                        accessToken: access_token,
                    } as ExtendedUser;
                } else {
                    throw new Error('access_token is null');
                }
            },
        }),
    ],
    // Route unauthenticated users (and NextAuth's default signin) to the admin login page.
    pages: {
        signIn: '/admin/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const extendedUser = user as ExtendedUser;
                const extendedToken = token as ExtendedJWT;
                if (extendedUser.accessToken) {
                    extendedToken.accessToken = extendedUser.accessToken;
                }
            }
            return token;
        },
        async session({ session, token }) {
            const extendedSession = session as ExtendedSession;
            const extendedToken = token as ExtendedJWT;

            if (extendedToken.accessToken) {
                extendedSession.accessToken = extendedToken.accessToken;
            }
            return extendedSession;
        },
    },
};
