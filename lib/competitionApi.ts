// 청약홈 경쟁률·당첨가점 API 조회 (서버 전용)
import { buildUnitResults, HISTORY_MONTHS, type ApiRow, type UnitResult } from '@/lib/competitionHistory';
import { parseUnitArea } from '@/lib/marketPrice';

const CMPET_BASE = 'https://api.odcloud.kr/api/ApplyhomeInfoCmpetRtSvc/v1';
const DETAIL_URL = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail';
const MAX_COMPLEXES = 15;
// 당첨자 발표·결과 공개까지 시간이 걸려 최근 공고는 제외
const RESULT_DELAY_DAYS = 35;
// 마감된 공고 결과는 바뀌지 않으므로 길게 캐시
const RESULT_REVALIDATE = 86400;

export class CompetitionApiError extends Error {}

async function fetchRows(url: string, revalidate: number): Promise<ApiRow[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate } });
  if (!response.ok) throw new CompetitionApiError(`odcloud ${response.status}`);
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function cmpetUrl(apiKey: string, operation: string, houseManageNo: string): string {
  const params = new URLSearchParams({ page: '1', perPage: '300', returnType: 'JSON' });
  params.append('cond[HOUSE_MANAGE_NO::EQ]', houseManageNo);
  return `${CMPET_BASE}/${operation}?serviceKey=${apiKey}&${params.toString()}`;
}

// 공고 1건의 주택형별 경쟁률·당첨가점 (마감 전이면 빈 배열)
export async function fetchComplexResults(apiKey: string, houseManageNo: string): Promise<UnitResult[]> {
  const [competition, scores] = await Promise.all([
    fetchRows(cmpetUrl(apiKey, 'getAPTLttotPblancCmpet', houseManageNo), RESULT_REVALIDATE),
    fetchRows(cmpetUrl(apiKey, 'getAptLttotPblancScore', houseManageNo), RESULT_REVALIDATE),
  ]);
  return buildUnitResults(competition, scores, parseUnitArea);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// 같은 시·도의 최근 12개월 민영 공고 (최신순)
async function fetchPastAnnouncements(apiKey: string, region: string, now: Date): Promise<{ id: string; date: string }[]> {
  const from = new Date(now);
  from.setMonth(from.getMonth() - HISTORY_MONTHS);
  const to = new Date(now.getTime() - RESULT_DELAY_DAYS * 86400000);

  const build = (withDate: boolean) => {
    const params = new URLSearchParams({ page: '1', perPage: '500', returnType: 'JSON' });
    params.append('cond[SUBSCRPT_AREA_CODE_NM::EQ]', region);
    if (withDate) {
      params.append('cond[RCRIT_PBLANC_DE::GTE]', ymd(from));
      params.append('cond[RCRIT_PBLANC_DE::LTE]', ymd(to));
    }
    return `${DETAIL_URL}?serviceKey=${apiKey}&${params.toString()}`;
  };

  let items: ApiRow[];
  try {
    items = await fetchRows(build(true), 21600);
  } catch {
    // 기간 조건을 지원하지 않는 경우 대비: 지역만으로 받아 아래에서 날짜로 거른다
    items = await fetchRows(build(false), 21600);
  }

  return items
    .filter((it) => String(it.HOUSE_DTL_SECD_NM ?? '') === '민영')
    .map((it) => ({ id: String(it.HOUSE_MANAGE_NO ?? ''), date: String(it.RCRIT_PBLANC_DE ?? '') }))
    .filter((a) => /^\d+$/.test(a.id) && a.date >= ymd(from) && a.date <= ymd(to))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// 지역 최근 민영 단지들의 결과. 개별 단지 조회 실패는 건너뛰고 실패 수를 함께 돌려준다.
export async function fetchRegionHistory(
  apiKey: string,
  region: string,
  now: Date,
  excludeId?: string,
): Promise<{ complexes: UnitResult[][]; failed: number }> {
  const past = (await fetchPastAnnouncements(apiKey, region, now))
    .filter((a) => a.id !== excludeId)
    .slice(0, MAX_COMPLEXES);
  const settled = await Promise.allSettled(past.map((a) => fetchComplexResults(apiKey, a.id)));
  const complexes = settled.flatMap((s) => (s.status === 'fulfilled' && s.value.length > 0 ? [s.value] : []));
  // 모든 단지가 실패했다면 키·활용신청 문제일 가능성이 높아 오류로 알린다
  if (past.length > 0 && settled.every((s) => s.status === 'rejected')) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }
  return { complexes, failed: settled.filter((s) => s.status === 'rejected').length };
}
