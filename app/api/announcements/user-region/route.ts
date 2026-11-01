import { NextResponse } from 'next/server';
import { getKakaoRestKey } from '@/lib/geocode';
import { toRegionOption } from '@/lib/regions';

const CACHE_SECONDS = 60 * 60 * 24 * 30;
// 같은 좌표(약 1km 격자)는 CDN에서 재사용해 카카오 호출을 줄인다. 실패는 짧게만 캐시한다.
// /api/announcements* 접두사는 미들웨어(토큰 갱신 Set-Cookie)에서 제외되어 공개 캐시해도 안전하다 (#115)
const OK_HEADERS = { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}` };
const MISS_HEADERS = { 'Cache-Control': 'public, s-maxage=300' };

function respond(region: string | null) {
  return NextResponse.json({ region }, { headers: region ? OK_HEADERS : MISS_HEADERS });
}

// 국내 좌표 범위 (밖이면 카카오를 호출하지 않는다)
function isInKorea(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
}

// 좌표 → 시/도 (지역 필터 값). 좌표는 소수 2자리(약 1km)로 줄여 조회하고 저장하지 않는다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInKorea(lat, lng)) {
    return respond(null);
  }

  const restKey = getKakaoRestKey();
  if (!restKey) return respond(null);

  const x = lng.toFixed(2);
  const y = lat.toFixed(2);
  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${x}&y=${y}`, {
      headers: { Authorization: `KakaoAK ${restKey}` },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(`[location] coord2regioncode ${res.status}`);
      return respond(null);
    }
    const json = (await res.json()) as { documents?: { region_type: string; region_1depth_name?: string }[] };
    const doc = json.documents?.find((d) => d.region_type === 'B') ?? json.documents?.[0];
    return respond(toRegionOption(doc?.region_1depth_name));
  } catch (error) {
    console.warn('[location] coord2regioncode failed', error instanceof Error ? error.message : error);
    return respond(null);
  }
}
