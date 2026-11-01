import type { KakaoUser, SessionUser, KakaoTokenResponse } from '@/types/auth';

const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

export function getKakaoAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_CLIENT_ID!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    response_type: 'code',
  });
  return `https://kauth.kakao.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<KakaoTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.KAKAO_CLIENT_ID!,
    client_secret: process.env.KAKAO_CLIENT_SECRET!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    code,
  });

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) throw new Error('카카오 토큰 교환 실패');
  return res.json() as Promise<KakaoTokenResponse>;
}

export async function getKakaoUser(accessToken: string): Promise<SessionUser> {
  const res = await fetch(KAKAO_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('카카오 사용자 정보 조회 실패');
  const data: KakaoUser = await res.json();

  return {
    id: String(data.id),
    nickname: data.kakao_account?.profile?.nickname ?? '사용자',
    profileImage: data.kakao_account?.profile?.thumbnail_image_url ?? '',
  };
}

export type RefreshResult =
  | { ok: true; data: KakaoTokenResponse }
  | { ok: false; kind: 'network' | 'api' };

export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.KAKAO_CLIENT_ID!,
    client_secret: process.env.KAKAO_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  try {
    const res = await fetch(KAKAO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) return { ok: false, kind: 'api' };
    const data = await res.json() as KakaoTokenResponse;
    return { ok: true, data };
  } catch {
    // fetch() throws TypeError on network failure (DNS, connection refused, etc.)
    return { ok: false, kind: 'network' };
  }
}

const KAKAO_UNLINK_URL = 'https://kapi.kakao.com/v1/user/unlink';

export type KakaoIdResult =
  | { ok: true; id: string }
  | { ok: false; kind: 'network' | 'api' };

// 토큰으로 카카오 회원번호만 확인한다 — 위조 가능한 세션 쿠키 대신 본인 확인에 쓴다
export async function verifyKakaoId(accessToken: string): Promise<KakaoIdResult> {
  try {
    const res = await fetch(KAKAO_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, kind: 'api' };
    const data = (await res.json()) as KakaoUser;
    if (data?.id === undefined || data?.id === null) return { ok: false, kind: 'api' };
    return { ok: true, id: String(data.id) };
  } catch {
    return { ok: false, kind: 'network' };
  }
}

// 카카오 계정과 서비스 연결 끊기. 성공 여부만 돌려준다
export async function unlinkKakaoUser(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(KAKAO_UNLINK_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
