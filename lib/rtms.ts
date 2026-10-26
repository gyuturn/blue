// 국토교통부 아파트 매매 실거래가 API 호출 (서버 전용)
import { unstable_cache } from 'next/cache';
import { MARKET_MONTHS, parseTradesXml, recentMonths, tag, type AptTrade } from '@/lib/marketPrice';

const RTMS_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const PAGE_SIZE = 1000;
const MAX_PAGES = 3;
const REQUEST_TIMEOUT_MS = 5000;

export function getRtmsKey(): string | undefined {
  return process.env.RTMS_API_KEY || process.env.PUBLIC_DATA_API_KEY || undefined;
}

async function fetchMonth(lawdCd: string, ym: string, key: string): Promise<AptTrade[]> {
  const all: AptTrade[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    // 공공데이터포털 인코딩 키는 URL에 그대로 넣는다 (이중 인코딩 방지)
    const url = `${RTMS_URL}?serviceKey=${key}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=${PAGE_SIZE}&pageNo=${page}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`rtms ${res.status}`);
    const xml = await res.text();
    // 키 미등록·쿼터 초과는 HTTP 200 + <OpenAPI_ServiceResponse>로 오므로 resultCode 000만 정상으로 본다
    const code = tag(xml, 'resultCode');
    if (code !== '000') throw new Error(`rtms ${code || tag(xml, 'returnReasonCode') || 'unknown'} ${tag(xml, 'resultMsg') || tag(xml, 'returnAuthMsg')}`);
    const { trades, totalCount } = parseTradesXml(xml);
    all.push(...trades);
    if (page * PAGE_SIZE >= totalCount) break;
    if (page === MAX_PAGES) console.warn(`[rtms] ${lawdCd} ${ym} ${totalCount}건 중 ${PAGE_SIZE * MAX_PAGES}건만 사용`);
  }
  return all;
}

// 정상 응답만 캐시한다 (예외는 캐시되지 않음). 지난 달은 24시간, 이번 달은 6시간.
function cachedMonth(lawdCd: string, ym: string, key: string, isCurrentMonth: boolean): Promise<AptTrade[]> {
  return unstable_cache(() => fetchMonth(lawdCd, ym, key), ['rtms-apt-trade', lawdCd, ym], {
    revalidate: isCurrentMonth ? 60 * 60 * 6 : 60 * 60 * 24,
  })();
}

// 시군구의 최근 거래. 일부 월 실패는 건너뛰고(complete=false), 전부 실패하면 예외.
export async function fetchRecentTrades(
  lawdCd: string,
  key: string,
  now = new Date(),
): Promise<{ trades: AptTrade[]; complete: boolean }> {
  const months = recentMonths(now, MARKET_MONTHS);
  const results = await Promise.allSettled(months.map((ym, i) => cachedMonth(lawdCd, ym, key, i === 0)));
  const ok = results.filter((r): r is PromiseFulfilledResult<AptTrade[]> => r.status === 'fulfilled');
  if (ok.length === 0) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  return { trades: ok.flatMap((r) => r.value), complete: ok.length === months.length };
}
