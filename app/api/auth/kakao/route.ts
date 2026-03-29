import { redirect } from 'next/navigation';
import { getKakaoAuthUrl } from '@/lib/auth/kakao';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!process.env.KAKAO_CLIENT_ID || !process.env.KAKAO_REDIRECT_URI) {
    console.error('[Kakao Auth] 환경변수 누락: KAKAO_CLIENT_ID 또는 KAKAO_REDIRECT_URI가 설정되지 않았습니다.');
    return NextResponse.json({ error: '카카오 로그인 설정 오류' }, { status: 500 });
  }
  const url = getKakaoAuthUrl();
  redirect(url);
}
