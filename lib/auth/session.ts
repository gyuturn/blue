import { cookies } from 'next/headers';
import type { SessionUser, TokenData } from '@/types/auth';

const SESSION_COOKIE = 'blue_session';
const ACCESS_TOKEN_COOKIE = 'blue_access_token';
const REFRESH_TOKEN_COOKIE = 'blue_refresh_token';
const EXPIRES_AT_COOKIE = 'blue_token_expires_at';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function setSession(user: SessionUser, tokens: TokenData): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    ...BASE_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: Math.max(0, tokens.expiresAt - Math.floor(Date.now() / 1000)),
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...BASE_COOKIE_OPTIONS,
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
  });

  cookieStore.set(EXPIRES_AT_COOKIE, String(tokens.expiresAt), {
    ...BASE_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: '/' });
  cookieStore.delete({ name: ACCESS_TOKEN_COOKIE, path: '/' });
  cookieStore.delete({ name: REFRESH_TOKEN_COOKIE, path: '/' });
  cookieStore.delete({ name: EXPIRES_AT_COOKIE, path: '/' });
}
