import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/kakao';

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
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(EXPIRES_AT_COOKIE);
}

export async function middleware(request: NextRequest) {
  const expiresAtRaw = request.cookies.get(EXPIRES_AT_COOKIE)?.value;

  // 비로그인 상태 — 통과
  if (!expiresAtRaw) {
    return NextResponse.next();
  }

  const expiresAt = parseInt(expiresAtRaw, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);

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

  try {
    const tokenResponse = await refreshAccessToken(refreshToken);
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
        maxAge: tokenResponse.refresh_token_expires_in ?? 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    const response = NextResponse.next();

    // 에러 분류 계약:
    // - TypeError: fetch() 자체의 네트워크 실패 (DNS 오류, 연결 거부 등)
    //   → 쿠키 변경 없이 통과 (카카오 서버 일시 장애로 서비스 중단 방지)
    // - Error('카카오 토큰 갱신 실패'): 카카오가 4xx 응답 반환 (토큰 무효/만료)
    //   → 세션 전체 삭제 (로그아웃)
    // 주의: refreshAccessToken 내부에서 Error 타입을 변경하면 이 분기 로직도 함께 수정해야 한다.
    if (error instanceof TypeError) {
      return response;
    }

    // 카카오 API 4xx 등 토큰 무효 — 로그아웃 처리
    clearAllCookies(response);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
