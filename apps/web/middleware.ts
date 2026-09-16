import { NextResponse, type NextRequest } from 'next/server';
import { auth } from './src/lib/auth/server';

const neonMiddleware = auth.middleware({ loginUrl: '/login' });
export default async function middleware(request: NextRequest) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
      return new NextResponse('Cross-site mutation rejected', { status: 403 });
    }
  }
  return neonMiddleware(request);
}

export const config = {
  matcher: ['/app/:path*'],
};
