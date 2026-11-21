import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { db, ensureSchema } from './db';
import { NextResponse } from 'next/server';
import { hasRole, priceVisible } from './policy.mjs';

const COOKIE = 'protech_session';
const DEFAULT_JWT_SECRET = 'pte-production-jwt-secret-secure-key-32chars-min-protech-enterprises!';

function jwtKey() {
  const raw = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return new TextEncoder().encode(raw);
}

export async function issueSession(role: 'user' | 'admin', id: number, version: number) {
  return new SignJWT({ role, ver: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtKey());
}

export async function setSession(response: NextResponse, role: 'user' | 'admin', id: number, version: number) {
  response.cookies.set(COOKIE, await issueSession(role, id, version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export type Principal = {
  role: 'user' | 'admin';
  id: number;
  version: number;
  name: string;
  mobile?: string;
  mustChange?: boolean;
  canSeePrices?: boolean;
};

export const principal = cache(async (): Promise<Principal | null> => {
  try {
    await ensureSchema();
    const c = await cookies();
    const token = c.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, jwtKey());
    const id = Number(payload.sub);
    const role = payload.role;
    const version = Number(payload.ver);
    if (!Number.isSafeInteger(id) || (role !== 'user' && role !== 'admin')) return null;

    const row = await db().execute({
      sql: role === 'admin'
        ? 'SELECT id, username AS name, token_version FROM admin_users WHERE id = ?'
        : 'SELECT id, name, mobile, token_version, must_change_password, price_visible, price_expires_at FROM users WHERE id = ?',
      args: [id],
    });
    const u = row.rows[0];
    if (!u || Number(u.token_version) !== version) return null;

    const canSeePrices = role === 'admin' ? true : priceVisible(Boolean(u.price_visible), u.price_expires_at ? String(u.price_expires_at) : null);
    return {
      role,
      id,
      name: String(u.name),
      version,
      canSeePrices,
      ...(u.mobile ? { mobile: String(u.mobile) } : {}),
      ...(role === 'user' ? { mustChange: Boolean(u.must_change_password) } : {}),
    };
  } catch {
    return null;
  }
});

export async function requireRole(role: 'admin' | 'user') {
  const p = await principal();
  return hasRole(p, role) ? p : null;
}

export async function validOrigin(request: Request) {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') return true;

  const origin = request.headers.get('origin');
  if (!origin) {
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
    const referer = request.headers.get('referer');
    if (referer && host) {
      try {
        const refUrl = new URL(referer);
        return refUrl.host === host || refUrl.hostname === host.split(':')[0];
      } catch {
        return false;
      }
    }
    return true;
  }

  if (process.env.APP_ORIGIN && (origin === process.env.APP_ORIGIN || origin.replace(/\/$/, '') === process.env.APP_ORIGIN.replace(/\/$/, ''))) return true;

  try {
    const origUrl = new URL(origin);
    // Allow local development on any port
    if (origUrl.hostname === 'localhost' || origUrl.hostname === '127.0.0.1') return true;
    // Allow vercel preview / production domains
    if (origUrl.hostname.endsWith('.vercel.app')) return true;

    const hostHeader = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
    if (hostHeader) {
      if (origUrl.host === hostHeader || origUrl.hostname === hostHeader.split(':')[0]) return true;
    }

    const reqUrl = new URL(request.url);
    if (reqUrl.origin === origin || reqUrl.host === origUrl.host || reqUrl.hostname === origUrl.hostname) return true;
  } catch {}

  return false;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
