import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { createTokenSession } from './lib/auth/token-session';

const sessionMaxAgeSeconds = 8 * 60 * 60;
const secureAuthCookie = process.env.AUTH_URL?.startsWith('https://') ?? false;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: sessionMaxAgeSeconds,
  },
  cookies: {
    sessionToken: {
      name:
        secureAuthCookie
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: secureAuthCookie,
      },
    },
  },
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        const authSessionId = await createTokenSession({
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? '',
          idToken: account.id_token,
          expiresAt: account.expires_at ?? Math.floor(Date.now() / 1000) + 300,
        });
        return {
          ...token,
          authSessionId,
          error: undefined,
        };
      }
      if (token.authSessionId) return token;
      return token;
    },
    async session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
});
