import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getKakaoUser } from '@/lib/auth/kakao';
import { setSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?login=failed', request.url));
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const user = await getKakaoUser(accessToken);
    await setSession(user);
    return NextResponse.redirect(new URL('/', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?login=failed', request.url));
  }
}
