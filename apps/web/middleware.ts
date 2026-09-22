import { NextResponse, type NextRequest } from 'next/server';
export default async function middleware(request: NextRequest) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin !== request.nextUrl.origin) {
      return new NextResponse('Cross-site mutation rejected', { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/api/:path*'],
};
