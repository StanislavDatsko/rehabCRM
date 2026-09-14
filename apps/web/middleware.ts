import { NextResponse } from 'next/server';
import { auth } from './src/auth';

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const valid = Boolean(session && !session.error);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
      return new NextResponse('Cross-site mutation rejected', { status: 403 });
    }
  }

  if (pathname.startsWith('/app') && !valid) {
    const login = new URL('/login', request.nextUrl.origin);
    if (session?.error === 'RefreshTokenError') {
      login.searchParams.set('reason', 'expired');
    }
    return NextResponse.redirect(login);
  }

  if (pathname === '/login' && valid) {
    return NextResponse.redirect(new URL('/app', request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/app/:path*', '/login'],
};
