import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { refreshAccessTokenOnce } from './lib/auth/refresh-access-token';

const sessionMaxAgeSeconds = 8 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: sessionMaxAgeSeconds,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
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
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: account.expires_at,
          error: undefined,
        };
      }
      if (token.error === 'RefreshTokenError') {
        return token;
      }
      if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 15_000) {
        return token;
      }
      return refreshAccessTokenOnce(token);
    },
    async session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
});
