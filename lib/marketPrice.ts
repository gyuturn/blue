// 국토교통부 아파트 매매 실거래가 → 주택형별 주변 시세 추정 (순수 함수, 클라이언트에서도 import)

export interface AptTrade {
  aptNm: string;
  umdNm: string;     // 법정동
  area: number;      // 전용면적(㎡)
  price: number;     // 거래금액(만원)
  buildYear: number;
  dealDate: string;  // YYYY-MM-DD
}

export interface MarketEstimate {
  estimate: number;  // 추정 시세(만원)
  count: number;     // 비교 거래 건수
  dong?: string;     // 같은 법정동 기준이면 동 이름, 없으면 시군구 전체
  newOnly: boolean;  // 10년 이내 준공 아파트만 비교했는지
  months: number;    // 조회 기간(개월)
}

export const MARKET_MONTHS = 6;
const AREA_TOLERANCE = 5;   // 전용면적 ±5㎡
const MIN_TRADES = 3;
const NEW_BUILD_YEARS = 10;

// 주택형 코드(예: 084.9800A)의 앞 숫자 = 전용면적
export function parseUnitArea(unitType: string): number | null {
  const m = unitType.trim().match(/^(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const area = parseFloat(m[1]);
  return isFinite(area) && area > 0 ? area : null;
}

// 기준일 포함 최근 n개월 (YYYYMM, 한국 시간 기준)
export function recentMonths(now: Date, n = MARKET_MONTHS): string[] {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - i, 1));
    result.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

export function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : '';
}

// RTMS XML 응답 → 거래 목록 (해제 거래·파싱 불가 행 제외)
export function parseTradesXml(xml: string): { trades: AptTrade[]; totalCount: number } {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const trades: AptTrade[] = [];
  for (const item of items) {
    if (tag(item, 'cdealType')) continue; // 해제된 거래
    const price = parseInt(tag(item, 'dealAmount').replace(/,/g, ''), 10);
    const area = parseFloat(tag(item, 'excluUseAr'));
    if (!(price > 0) || !(area > 0)) continue;
    const month = tag(item, 'dealMonth').padStart(2, '0');
    const day = tag(item, 'dealDay').padStart(2, '0');
    trades.push({
      aptNm: tag(item, 'aptNm'),
      umdNm: tag(item, 'umdNm'),
      area,
      price,
      buildYear: parseInt(tag(item, 'buildYear'), 10) || 0,
      dealDate: `${tag(item, 'dealYear')}-${month}-${day}`,
    });
  }
  return { trades, totalCount: parseInt(tag(xml, 'totalCount'), 10) || 0 };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 실거래 umdNm은 읍·면 지역에서 "봉담읍 동화리"처럼 올 수 있어 앞부분으로 비교한다
function isSameDong(umdNm: string, dong: string): boolean {
  return umdNm === dong || umdNm.startsWith(`${dong} `);
}

// 비슷한 면적 거래를 같은 동·신축 → 같은 동 → 시군구·신축 → 시군구 순으로 찾아
// ㎡당 가격 중위값 × 주택형 면적으로 시세를 추정한다.
export function estimateMarketPrice(
  trades: AptTrade[],
  area: number,
  dong: string | undefined,
  currentYear: number,
  months = MARKET_MONTHS,
): MarketEstimate | null {
  const similar = trades.filter((t) => Math.abs(t.area - area) <= AREA_TOLERANCE);
  const isNew = (t: AptTrade) => t.buildYear >= currentYear - NEW_BUILD_YEARS;
  const stages: { dong?: string; newOnly: boolean }[] = [
    ...(dong ? [{ dong, newOnly: true }, { dong, newOnly: false }] : []),
    { newOnly: true },
    { newOnly: false },
  ];
  for (const stage of stages) {
    const picked = similar.filter(
      (t) => (!stage.dong || isSameDong(t.umdNm, stage.dong)) && (!stage.newOnly || isNew(t)),
    );
    if (picked.length < MIN_TRADES) continue;
    const perSqm = median(picked.map((t) => t.price / t.area));
    return { estimate: Math.round(perSqm * area), count: picked.length, dong: stage.dong, newOnly: stage.newOnly, months };
  }
  return null;
}
