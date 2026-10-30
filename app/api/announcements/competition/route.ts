import { NextResponse } from 'next/server';
import { REGION_MAP, resolveRegionParam } from '@/lib/announcements';
import { fetchComplexResults, fetchRegionHistory } from '@/lib/competitionApi';
import { buildBucketStats, HISTORY_MONTHS } from '@/lib/competitionHistory';

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

  const [own, history] = await Promise.allSettled([
    fetchComplexResults(apiKey, houseManageNo),
    fetchRegionHistory(apiKey, region, new Date(), houseManageNo),
  ]);
  if (own.status === 'rejected' && history.status === 'rejected') {
    // 활용신청 미승인(401) 등 — 화면에서 섹션을 숨긴다 (메시지에는 상태 코드만 담긴다)
    console.error('[competition] error:', own.reason);
    const reason = own.reason instanceof Error ? own.reason.message.slice(0, 120) : 'unknown';
    return NextResponse.json({ enabled: false, reason }, { headers: { 'Cache-Control': SHORT_CACHE } });
  }

  const complexes = history.status === 'fulfilled' ? history.value : [];
  return NextResponse.json(
    {
      enabled: true,
      region,
      months: HISTORY_MONTHS,
      complexCount: complexes.length,
      own: own.status === 'fulfilled' ? own.value : [],
      stats: buildBucketStats(complexes),
    },
    { headers: { 'Cache-Control': own.status === 'fulfilled' && history.status === 'fulfilled' ? OK_CACHE : SHORT_CACHE } },
  );
}
