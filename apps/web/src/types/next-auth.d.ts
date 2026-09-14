import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    error?: 'RefreshTokenError';
    user: DefaultSession['user'] & {
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
    error?: 'RefreshTokenError';
  }
}
