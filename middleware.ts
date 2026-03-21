import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, type RefreshResult } from '@/lib/auth/kakao';

const ACCESS_TOKEN_COOKIE = 'blue_access_token';
const REFRESH_TOKEN_COOKIE = 'blue_refresh_token';
const EXPIRES_AT_COOKIE = 'blue_token_expires_at';
const SESSION_COOKIE = 'blue_session';

const REFRESH_BUFFER_SECONDS = 5 * 60; // 5분 전부터 갱신 시도

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function clearAllCookies(response: NextResponse): void {
  const deleteOptions = { path: '/' };
  response.cookies.delete({ name: SESSION_COOKIE, ...deleteOptions });
  response.cookies.delete({ name: ACCESS_TOKEN_COOKIE, ...deleteOptions });
  response.cookies.delete({ name: REFRESH_TOKEN_COOKIE, ...deleteOptions });
  response.cookies.delete({ name: EXPIRES_AT_COOKIE, ...deleteOptions });
}

export async function middleware(request: NextRequest) {
  const expiresAtRaw = request.cookies.get(EXPIRES_AT_COOKIE)?.value;
  const hasAccessToken = !!request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // 비로그인 상태 (access_token과 expires_at 모두 없음) — 통과
  if (!expiresAtRaw && !hasAccessToken) {
    return NextResponse.next();
  }

  const expiresAt = expiresAtRaw ? parseInt(expiresAtRaw, 10) : 0;
  const nowSeconds = Math.floor(Date.now() / 1000);

  // 쿠키 값이 유효하지 않으면 (NaN) 비로그인으로 처리
  if (isNaN(expiresAt)) {
    return NextResponse.next();
  }

  // 유효 (5분 이상 남음) — 통과
  if (expiresAt - nowSeconds > REFRESH_BUFFER_SECONDS) {
    return NextResponse.next();
  }

  // 만료 임박 or 만료 — 갱신 시도
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.next();
    clearAllCookies(response);
    return response;
  }

  const result = await refreshAccessToken(refreshToken);

  if (!result.ok) {
    const response = NextResponse.next();
    if (result.kind === 'network') {
      // 네트워크 오류 — 카카오 서버 일시 장애. 쿠키 변경 없이 통과하여 서비스 중단 방지.
      return response;
    }
    // 카카오 API 오류 (토큰 무효/만료) — 세션 전체 삭제
    clearAllCookies(response);
    return response;
  }

  const tokenResponse = result.data;
  const newExpiresAt = nowSeconds + tokenResponse.expires_in;
  const response = NextResponse.next();

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokenResponse.access_token, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: tokenResponse.expires_in,
  });

  response.cookies.set(EXPIRES_AT_COOKIE, String(newExpiresAt), {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7,
  });

  // 카카오가 새 refresh_token을 포함한 경우에만 갱신
  if (tokenResponse.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokenResponse.refresh_token, {
      ...BASE_COOKIE_OPTIONS,
      sameSite: 'strict',
      maxAge: tokenResponse.refresh_token_expires_in ?? 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
