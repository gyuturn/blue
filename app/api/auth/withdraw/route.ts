import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, describeDbError } from '@/lib/db';
import { favorites, subscriptionScores } from '@/lib/db/schema';
import { refreshAccessToken, unlinkKakaoUser, verifyKakaoId } from '@/lib/auth/kakao';
import { getSession } from '@/lib/auth/session';
import type { KakaoTokenResponse } from '@/types/auth';

// 탈퇴 시 지우는 쿠키 — 세션·토큰과 약관 동의 기록
const ACCOUNT_COOKIES = [
  'blue_session',
  'blue_access_token',
  'blue_refresh_token',
  'blue_token_expires_at',
  'blue_terms_agreed',
];

const REFRESH_BUFFER_SECONDS = 5 * 60;

function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// 유효한 access token을 얻는다 — /api/auth는 middleware 갱신 대상이 아니라 여기서 직접 갱신한다
async function getAccessToken(
  request: NextRequest,
): Promise<
  { ok: true; token: string; refreshed?: KakaoTokenResponse } | { ok: false; kind: 'network' | 'api' }
> {
  const accessToken = request.cookies.get('blue_access_token')?.value;
  const expiresAt = Number(request.cookies.get('blue_token_expires_at')?.value);
  const now = Math.floor(Date.now() / 1000);

  if (accessToken && Number.isFinite(expiresAt) && expiresAt - now > REFRESH_BUFFER_SECONDS) {
    return { ok: true, token: accessToken };
  }

  const refreshToken = request.cookies.get('blue_refresh_token')?.value;
  if (!refreshToken) return { ok: false, kind: 'api' };

  const refreshed = await refreshAccessToken(refreshToken);
  if (!refreshed.ok) return refreshed;
  return { ok: true, token: refreshed.data.access_token, refreshed: refreshed.data };
}

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// 탈퇴가 중간에 실패해 로그인이 유지될 때, 여기서 갱신한 토큰을 저장해 둔다 (카카오가 refresh token을 교체했을 수 있음)
function keepRefreshedTokens(response: NextResponse, refreshed: KakaoTokenResponse | undefined) {
  if (!refreshed) return response;
  const now = Math.floor(Date.now() / 1000);
  response.cookies.set('blue_access_token', refreshed.access_token, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: refreshed.expires_in,
  });
  response.cookies.set('blue_token_expires_at', String(now + refreshed.expires_in), {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7,
  });
  if (refreshed.refresh_token) {
    response.cookies.set('blue_refresh_token', refreshed.refresh_token, {
      ...BASE_COOKIE_OPTIONS,
      sameSite: 'strict',
      maxAge: refreshed.refresh_token_expires_in ?? 60 * 60 * 24 * 7,
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return error(401, 'reauth', '로그인이 만료됐어요. 다시 로그인한 뒤 탈퇴해 주세요.');
  }

  // 1. 본인 확인 — 세션 쿠키는 서명되지 않아 위조될 수 있으므로 카카오가 확인해 준 회원번호만 믿는다
  const token = await getAccessToken(request);
  if (!token.ok) {
    return token.kind === 'network'
      ? error(503, 'unavailable', '카카오 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.')
      : error(401, 'reauth', '로그인이 만료됐어요. 다시 로그인한 뒤 탈퇴해 주세요.');
  }

  const verified = await verifyKakaoId(token.token);
  if (!verified.ok) {
    return keepRefreshedTokens(
      verified.kind === 'network'
        ? error(503, 'unavailable', '카카오 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.')
        : error(401, 'reauth', '로그인이 만료됐어요. 다시 로그인한 뒤 탈퇴해 주세요.'),
      token.refreshed,
    );
  }
  if (verified.id !== session.id) {
    return keepRefreshedTokens(
      error(403, 'mismatch', '로그인 정보가 맞지 않아요. 다시 로그인한 뒤 탈퇴해 주세요.'),
      token.refreshed,
    );
  }
  const userId = verified.id;

  // 2. 저장된 개인정보 삭제 — 둘 다 지워지거나 둘 다 남도록 트랜잭션으로 묶는다
  try {
    await db.transaction(async (tx) => {
      await tx.delete(subscriptionScores).where(eq(subscriptionScores.userId, userId));
      await tx.delete(favorites).where(eq(favorites.userId, userId));
    });
  } catch (err) {
    console.error('[withdraw] DB 삭제 실패', describeDbError(err));
    // 쿠키를 지우지 않아 다시 시도할 수 있게 둔다
    return keepRefreshedTokens(
      error(500, 'db', '탈퇴 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'),
      token.refreshed,
    );
  }

  // 3. 카카오 연결 끊기 — 우리 쪽 데이터는 이미 지웠으므로 실패해도 탈퇴는 완료로 본다
  const kakaoUnlinked = await unlinkKakaoUser(token.token);
  if (!kakaoUnlinked) {
    console.error('[withdraw] 카카오 연결 끊기 실패');
  }

  // 4. 세션·약관 동의 쿠키 삭제 — 다시 가입하면 약관 동의를 새로 받는다
  const response = NextResponse.json({ ok: true, kakaoUnlinked });
  for (const name of ACCOUNT_COOKIES) {
    response.cookies.delete({ name, path: '/' });
  }
  return response;
}
