import { auth } from './server';

export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await auth.token();
  return error || !data?.token ? null : data.token;
}
