import { LoginService } from '@/lib/auth/auth.service'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

interface ExtendedUser {
  id: string
  name?: string | null
  email?: string | null
  accessToken?: string
}

interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires: string
  accessToken?: string
}

interface ExtendedJWT {
  accessToken?: string
  [key: string]: any
}

const handler = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error('Credentials are not sets')
        }

        const { username: email, password } = credentials
        const { access_token } = await LoginService.loginCredentials(email, password)

        if (access_token) {
          return {
            id: email,
            name: email,
            email: email,
            accessToken: access_token,
          } as ExtendedUser
        } else {
          throw new Error('access_token is null')
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser
        const extendedToken = token as ExtendedJWT
        if (extendedUser.accessToken) {
          extendedToken.accessToken = extendedUser.accessToken
        }
      }
      return token
    },
    async session({ session, token }) {
      const extendedSession = session as ExtendedSession
      const extendedToken = token as ExtendedJWT

      if (extendedToken.accessToken) {
        extendedSession.accessToken = extendedToken.accessToken
      }
      return extendedSession
    },
  },
})

export { handler as GET, handler as POST }
