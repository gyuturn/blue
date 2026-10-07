import { NextResponse } from 'next/server';
import { loadAnnouncements } from '@/lib/announcements';
import { geocodeMany, getKakaoRestKey } from '@/lib/geocode';

export const revalidate = 3600;
export const maxDuration = 30;

// 지도 탭용 공고 좌표. 클라이언트가 임의 주소를 보내지 못하도록 지역 단위 공고 목록 기준으로만 변환한다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') ?? undefined;

  const restKey = getKakaoRestKey();
  if (!restKey) {
    return NextResponse.json({ enabled: false, data: {} });
  }

  const { announcements } = await loadAnnouncements(region);
  const data = await geocodeMany(announcements, restKey);

  return NextResponse.json({ enabled: true, data });
}
