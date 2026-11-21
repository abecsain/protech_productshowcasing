import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = 'protech_session';

function getJwtKey(): Uint8Array | null {
  const raw = process.env.JWT_SECRET;
  return raw && raw.length >= 32 ? new TextEncoder().encode(raw) : null;
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

  // Admin routes protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!session || session.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
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

  // Customer routes protection (/home, /products, /cart) - Accessible to logged-in users and admins
  const isProtectedUserRoute = pathname.startsWith('/home') || pathname.startsWith('/products') || pathname.startsWith('/cart');
  if (isProtectedUserRoute) {
    if (!session || (session.role !== 'user' && session.role !== 'admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Already logged-in user or admin going to /auth
  if (pathname === '/auth' && session) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === 'admin' ? '/admin' : '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home/:path*',
    '/products/:path*',
    '/cart/:path*',
    '/admin/:path*',
    '/auth',
  ],
};
