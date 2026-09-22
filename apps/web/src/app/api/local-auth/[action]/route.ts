import { parseWebEnv } from '@repo/config/web-env';
import { NextResponse } from 'next/server';

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ message: 'Invalid origin.' }, { status: 403 });
  }
  const { action } = await context.params;
  if (!['login', 'register', 'logout'].includes(action)) return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  const env = parseWebEnv();
  const upstream = await fetch(`${env.API_INTERNAL_URL}/api/v1/auth/${action}`, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' }, body: await request.text(), cache: 'no-store',
  });
  const response = new NextResponse(upstream.body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' } });
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) response.headers.set('set-cookie', setCookie);
  response.headers.set('cache-control', 'no-store');
  return response;
}
