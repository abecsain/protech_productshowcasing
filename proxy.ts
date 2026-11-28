import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = 'protech_session';
const DEFAULT_JWT_SECRET = 'pte-production-jwt-secret-secure-key-32chars-min-protech-enterprises!';

function getJwtKey(): Uint8Array {
  const raw = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return new TextEncoder().encode(raw);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;

  let session: { role: string; id: number } | null = null;
  const key = getJwtKey();
  if (token && key) {
    try {
      const { payload } = await jwtVerify(token, key);
      const role = String(payload.role);
      const id = Number(payload.sub);
      if (Number.isSafeInteger(id) && (role === 'user' || role === 'admin')) {
        session = { role, id };
      }
    } catch {
      session = null;
    }
  }

  // Root path redirect without hitting remote DB
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = session?.role === 'admin' ? '/admin' : '/products';
    return NextResponse.redirect(url);
  }

  // Admin routes protection — redirect unauthorized visitors to main home page
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!session || session.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Already logged-in admin going to /admin/login
  if (pathname === '/admin/login' && session?.role === 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Already logged-in user or admin going to /auth
  if (pathname === '/auth' && session) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === 'admin' ? '/admin' : '/products';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/auth',
  ],
};
