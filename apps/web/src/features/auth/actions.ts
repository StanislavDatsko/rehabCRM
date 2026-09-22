'use server';

import { redirect } from 'next/navigation';
import { parseWebEnv } from '@repo/config/web-env';
import { cookies } from 'next/headers';

export async function logoutStaff(): Promise<void> {
  const env = parseWebEnv();
  await fetch(`${env.API_INTERNAL_URL}/api/v1/auth/logout`, { method: 'POST', headers: { Cookie: (await cookies()).toString() }, cache: 'no-store' });
  (await cookies()).delete('rehabmis_session');
  redirect('/login');
}
