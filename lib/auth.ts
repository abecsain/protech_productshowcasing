import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { type NextRequest } from 'next/server';

// ─── Constants ────────────────────────────────────────────────
export const USER_COOKIE = 'pte_session';
export const ADMIN_COOKIE = 'pte_admin';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

function getSecret(env: string, fallback: string): Uint8Array {
  const val = process.env[env];
  if (!val || val.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${env} must be set and at least 32 characters in production`);
    }
    return new TextEncoder().encode(fallback.padEnd(32, '!'));
  }
  return new TextEncoder().encode(val);
}

// ─── User JWT ─────────────────────────────────────────────────
export interface UserPayload extends JWTPayload {
  id: number;
  name: string;
  mobile: string;
}

export async function signUserToken(payload: Omit<UserPayload, keyof JWTPayload>): Promise<string> {
  const secret = getSecret('JWT_SECRET', 'pte-user-dev-secret');
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyUserToken(token: string): Promise<UserPayload | null> {
  try {
    const secret = getSecret('JWT_SECRET', 'pte-user-dev-secret');
    const { payload } = await jwtVerify(token, secret);
    return payload as UserPayload;
  } catch {
    return null;
  }
}

export async function getUserSession(req: NextRequest): Promise<UserPayload | null> {
  const token = req.cookies.get(USER_COOKIE)?.value;
  if (!token) return null;
  return verifyUserToken(token);
}

export function userCookieOptions(token: string) {
  return {
    name: USER_COOKIE,
    value: token,
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}

export function clearUserCookie() {
  return { name: USER_COOKIE, value: '', ...COOKIE_OPTIONS, maxAge: 0 };
}

// ─── Admin JWT ────────────────────────────────────────────────
export interface AdminPayload extends JWTPayload {
  id: number;
  username: string;
}

export async function signAdminToken(payload: Omit<AdminPayload, keyof JWTPayload>): Promise<string> {
  const secret = getSecret('ADMIN_JWT_SECRET', 'pte-admin-dev-secret');
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const secret = getSecret('ADMIN_JWT_SECRET', 'pte-admin-dev-secret');
    const { payload } = await jwtVerify(token, secret);
    return payload as AdminPayload;
  } catch {
    return null;
  }
}

export async function getAdminSession(req: NextRequest): Promise<AdminPayload | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function adminCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 8, // 8 hours
  };
}

export function clearAdminCookie() {
  return { name: ADMIN_COOKIE, value: '', ...COOKIE_OPTIONS, maxAge: 0 };
}
