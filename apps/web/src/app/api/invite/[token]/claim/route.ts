import { parseWebEnv } from '@repo/config/web-env';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ message: 'Invalid origin.' }, { status: 403 });
  }
  const { token } = await context.params;
  const env = parseWebEnv();
  const response = await fetch(`${env.API_INTERNAL_URL}/api/v1/invite/${encodeURIComponent(token)}/claim`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const body = await response.arrayBuffer();
  const result = new Response(body.byteLength ? body : null, {
    status: response.status,
    headers: response.headers.get('content-type') ? { 'content-type': response.headers.get('content-type')! } : undefined,
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) result.headers.set('set-cookie', setCookie);
  return result;
}
