import { parseWebEnv } from '@repo/config/web-env';
import { getAccessToken } from '@/lib/auth/access-token';

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return Response.json({ code: 'UNAUTHENTICATED', message: 'Authentication is required.' }, { status: 401 });
  }

  const env = parseWebEnv();
  const response = await fetch(`${env.API_INTERNAL_URL}/api/v1/invite/${encodeURIComponent(token)}/claim`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const body = await response.arrayBuffer();
  return new Response(body.byteLength ? body : null, {
    status: response.status,
    headers: response.headers.get('content-type') ? { 'content-type': response.headers.get('content-type')! } : undefined,
  });
}
