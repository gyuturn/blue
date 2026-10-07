import { redirect } from 'next/navigation';
import { getKakaoAuthUrl } from '@/lib/auth/kakao';

export async function GET() {
  const url = getKakaoAuthUrl();
  redirect(url);
}
