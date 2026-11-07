import { NextResponse } from 'next/server';
import { REGION_MAP, resolveRegionParam } from '@/lib/announcements';
import { fetchComplexResults, fetchComplexSpecial, fetchRegionHistory } from '@/lib/competitionApi';
import { buildBucketStats, buildSpecialStats, HISTORY_MONTHS } from '@/lib/competitionHistory';

export const maxDuration = 30;

const OK_CACHE = 'public, s-maxage=21600, stale-while-revalidate=86400';
const SHORT_CACHE = 'public, s-maxage=300';
const REGIONS = new Set(Object.values(REGION_MAP));

// 이 공고의 실제 결과 + 같은 시·도 최근 민영 단지의 면적대별 당첨선. GET ?houseManageNo=...&region=서울
// 내 가점은 받지 않는다 — 비교·판정은 클라이언트에서 한다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseManageNo = searchParams.get('houseManageNo') ?? '';
  const region = resolveRegionParam(searchParams.get('region') ?? '');
  if (!/^\d{1,20}$/.test(houseManageNo) || !REGIONS.has(region)) {
    return NextResponse.json({ error: 'houseManageNo and region required' }, { status: 400 });
  }

  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ enabled: false, reason: 'no-key' }, { headers: { 'Cache-Control': SHORT_CACHE } });
  }

  const [own, ownSpecial, history] = await Promise.allSettled([
    fetchComplexResults(apiKey, houseManageNo),
    // 특별공급 신청현황은 별도 오퍼레이션 — 실패해도 일반공급 결과는 그대로 보여준다
    fetchComplexSpecial(apiKey, houseManageNo),
    fetchRegionHistory(apiKey, region, new Date(), houseManageNo),
  ]);
  if (own.status === 'rejected' && history.status === 'rejected') {
    // 활용신청 미승인(401) 등 — 화면에서 섹션을 숨긴다 (메시지에는 상태 코드만 담긴다)
    console.error('[competition] error:', own.reason);
    const reason = own.reason instanceof Error ? own.reason.message.slice(0, 120) : 'unknown';
    return NextResponse.json({ enabled: false, reason }, { headers: { 'Cache-Control': SHORT_CACHE } });
  }

  if (ownSpecial.status === 'rejected') console.error('[competition] special error:', ownSpecial.reason);
  const complexes = history.status === 'fulfilled' ? history.value.complexes : [];
  const specialComplexes = history.status === 'fulfilled' ? history.value.special : [];
  // 일반공급 조회가 일부라도 실패했다면 표본이 줄어든 통계라 짧게만 캐시.
  // 특공 조회 실패는 캐시 판단에서 뺀다 — 특공 API만 계속 실패할 때 매번 5분 캐시로 호출이 몰리지 않도록.
  const complete = own.status === 'fulfilled' && history.status === 'fulfilled' && history.value.failed === 0;
  return NextResponse.json(
    {
      enabled: true,
      region,
      months: HISTORY_MONTHS,
      complexCount: complexes.length,
      own: own.status === 'fulfilled' ? own.value : [],
      stats: buildBucketStats(complexes),
      special: ownSpecial.status === 'fulfilled' ? ownSpecial.value : [],
      specialComplexCount: specialComplexes.length,
      specialStats: buildSpecialStats(specialComplexes),
    },
    { headers: { 'Cache-Control': complete ? OK_CACHE : SHORT_CACHE } },
  );
}
