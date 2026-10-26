import { NextResponse } from 'next/server';
import { fetchApplyhomeDetail } from '@/lib/applyhomeDetail';
import { geocodeAddress, getKakaoRestKey, getLegalDong } from '@/lib/geocode';
import { estimateMarketPrice, parseUnitArea, type MarketEstimate } from '@/lib/marketPrice';
import { fetchRecentTrades, getRtmsKey } from '@/lib/rtms';

export const maxDuration = 30;

const MAX_AREAS = 10;
const OK_CACHE = 'public, s-maxage=21600, stale-while-revalidate=86400';
const SHORT_CACHE = 'public, s-maxage=300';

// 공고 주변 실거래가로 주택형(전용면적)별 시세를 추정한다. GET ?houseManageNo=...&pblancNo=...
// 임의 주소로 외부 API를 부르지 못하도록 주소·주택형은 서버가 청약홈 상세에서 직접 가져온다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseManageNo = searchParams.get('houseManageNo') ?? '';
  const pblancNo = searchParams.get('pblancNo') || houseManageNo;
  if (!/^\d{1,20}$/.test(houseManageNo) || !/^\d{1,20}$/.test(pblancNo)) {
    return NextResponse.json({ error: 'houseManageNo required' }, { status: 400 });
  }

  const rtmsKey = getRtmsKey();
  const restKey = getKakaoRestKey();
  if (!rtmsKey || !restKey) {
    return NextResponse.json({ enabled: false, data: {} }, { headers: { 'Cache-Control': SHORT_CACHE } });
  }

  try {
    const detail = await fetchApplyhomeDetail(houseManageNo, pblancNo);
    const areas = [...new Set(detail.units.map((u) => parseUnitArea(u.type)).filter((a): a is number => a !== null))]
      .slice(0, MAX_AREAS);
    const address = detail.location?.trim();
    const sido = address?.split(/\s+/)[0];
    const coords = address && areas.length > 0 ? await geocodeAddress(address, restKey, sido) : null;
    const legalDong = coords ? await getLegalDong(coords, restKey) : null;
    if (!legalDong) {
      // 일시 장애일 수 있어 짧게만 캐시
      return NextResponse.json({ enabled: true, data: {} }, { headers: { 'Cache-Control': SHORT_CACHE } });
    }

    const now = new Date();
    const { trades, complete } = await fetchRecentTrades(legalDong.lawdCd, rtmsKey, now);
    const data: Record<string, MarketEstimate | null> = {};
    for (const area of areas) {
      data[String(area)] = estimateMarketPrice(trades, area, legalDong.dong, now.getFullYear());
    }

    return NextResponse.json(
      { enabled: true, data },
      { headers: { 'Cache-Control': complete ? OK_CACHE : SHORT_CACHE } },
    );
  } catch (error) {
    console.error('[market-price] error:', error);
    return NextResponse.json({ error: 'market price unavailable' }, { status: 502 });
  }
}
