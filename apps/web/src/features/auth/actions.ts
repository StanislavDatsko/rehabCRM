'use server';

import { redirect } from 'next/navigation';
import { signIn, signOut } from '../../auth';
import { getAuthSessionId, getIdToken } from '../../lib/auth/access-token';
import { deleteTokenSession } from '../../lib/auth/token-session';

export async function startStaffLogin(): Promise<void> {
  await signIn('keycloak', { redirectTo: '/' });
}

export async function logoutStaff(): Promise<void> {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const idToken = await getIdToken();
  const authSessionId = await getAuthSessionId();
  const loginUrl = `${process.env.AUTH_URL ?? 'http://localhost:3000'}/login`;
  await signOut({ redirect: false });
  if (authSessionId) await deleteTokenSession(authSessionId);
  if (issuer && clientId) {
    const params = new URLSearchParams({
      post_logout_redirect_uri: loginUrl,
      client_id: clientId,
    });
    if (idToken) {
      params.set('id_token_hint', idToken);
    }
    redirect(`${issuer}/protocol/openid-connect/logout?${params.toString()}`);
  }
  redirect('/login');
}
