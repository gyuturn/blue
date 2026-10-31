import { NextResponse } from 'next/server';
import { fetchAnnouncementAddress } from '@/lib/announcements';
import { fetchApplyhomeDetail } from '@/lib/applyhomeDetail';
import { resolveLawd } from '@/lib/lawdCode';
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
  if (!rtmsKey) {
    console.warn('[market-price] 실거래가 API 키 없음');
    return NextResponse.json({ enabled: false, reason: 'no-key', data: {} }, { headers: { 'Cache-Control': SHORT_CACHE } });
  }

  try {
    const detail = await fetchApplyhomeDetail(houseManageNo, pblancNo);
    const areas = [...new Set(detail.units.map((u) => parseUnitArea(u.type)).filter((a): a is number => a !== null))]
      .slice(0, MAX_AREAS);
    // 공공분양 등은 청약홈 상세에 공급위치가 없을 수 있어 공고 API 주소로 보완
    const address = detail.location?.trim() || (await fetchAnnouncementAddress(houseManageNo));
    const target = address && areas.length > 0 ? resolveLawd(address) : null;
    if (!target) {
      const reason = areas.length === 0 ? 'no-units' : !address ? 'no-address' : 'unknown-sigungu';
      console.warn(`[market-price] ${houseManageNo} ${reason} (${address ?? '주소 없음'})`);
      return NextResponse.json({ enabled: true, reason, data: {} }, { headers: { 'Cache-Control': SHORT_CACHE } });
    }

    const now = new Date();
    // 구가 생략된 시는 하위 구 전체를 조회해 합친다
    const results = await Promise.all(target.lawdCds.map((code) => fetchRecentTrades(code, rtmsKey, now)));
    const trades = results.flatMap((r) => r.trades);
    const complete = results.every((r) => r.complete);
    const data: Record<string, MarketEstimate | null> = {};
    for (const area of areas) {
      data[String(area)] = estimateMarketPrice(trades, area, target.dong, now.getFullYear());
    }

    return NextResponse.json(
      { enabled: true, data },
      { headers: { 'Cache-Control': complete ? OK_CACHE : SHORT_CACHE } },
    );
  } catch (error) {
    console.error('[market-price] error:', error);
    // 원인 파악용 (메시지에는 상태 코드·API 오류 코드만 담기고 키는 담기지 않는다)
    const reason = error instanceof Error ? error.message.slice(0, 120) : 'unknown';
    return NextResponse.json({ error: 'market price unavailable', reason }, { status: 502 });
  }
}
