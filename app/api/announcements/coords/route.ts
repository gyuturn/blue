import { NextResponse } from 'next/server';
import { getAnnouncementsCacheControl, loadAnnouncements } from '@/lib/announcements';
import { geocodeMany, getKakaoRestKey } from '@/lib/geocode';

export const maxDuration = 30;

// 지도 탭용 공고 좌표. 클라이언트가 임의 주소를 보내지 못하도록 지역 단위 공고 목록 기준으로만 변환한다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') ?? undefined;

  const restKey = getKakaoRestKey();
  if (!restKey) {
    // 키가 새로 설정되면 곧바로 반영되도록 짧게만 캐시
    return NextResponse.json(
      { enabled: false, data: {} },
      { headers: { 'Cache-Control': getAnnouncementsCacheControl(true) } },
    );
  }

  const { announcements, isMock } = await loadAnnouncements(region);
  const { data, complete } = await geocodeMany(announcements, restKey);

  // 쿼터 초과 등으로 일부만 변환됐으면 짧게만 캐시해 복구 후 곧바로 다시 채운다
  return NextResponse.json(
    { enabled: true, data },
    { headers: { 'Cache-Control': getAnnouncementsCacheControl(isMock || !complete) } },
  );
}
