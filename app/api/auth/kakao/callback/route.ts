import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getKakaoUser } from '@/lib/auth/kakao';
import { setSession } from '@/lib/auth/session';
import type { TokenData } from '@/types/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?login=failed', request.url));
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const user = await getKakaoUser(tokenResponse.access_token);

    // 초기 authorization_code 교환에서 카카오는 항상 refresh_token을 반환한다.
    // 없다면 비정상 응답이므로 명시적으로 실패 처리한다.
    if (!tokenResponse.refresh_token) {
      throw new Error('카카오 초기 토큰에 refresh_token 없음');
    }

    const tokens: TokenData = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
    };

    await setSession(user, tokens);
    return NextResponse.redirect(new URL('/', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?login=failed', request.url));
  }
}
