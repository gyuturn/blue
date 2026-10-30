// 청약홈 경쟁률·당첨가점 → 주택형별 결과, 면적대별 과거 당첨선, 내 가점 판정 (순수 함수, 클라이언트에서도 import)
import type { SpecialSupplyEligibility } from '@/types';

export type ApiRow = Record<string, string | number | null | undefined>;

export interface UnitResult {
  houseType: string;      // 주택형 (예: 084.9800A)
  area: number | null;    // 전용면적(㎡)
  supply: number;         // 1순위 공급 세대수
  requests: number;       // 1순위 접수 건수
  rate: number | null;    // 1순위 경쟁률 (미달·미산정이면 null)
  shortfall: number | null; // 미달 세대수
  lowest: number | null;  // 최저 당첨가점
  average: number | null; // 평균 당첨가점
  top: number | null;     // 최고 당첨가점
}

export type AreaBucket = 'small' | 'mid' | 'large';

export const AREA_BUCKET_LABEL: Record<AreaBucket, string> = {
  small: '60㎡ 이하',
  mid: '60~85㎡',
  large: '85㎡ 초과',
};

export interface BucketStats {
  bucket: AreaBucket;
  complexCount: number;    // 당첨가점이 있는 단지 수
  lowestMedian: number;    // 단지별 최저 당첨가점의 중앙값
  lowestMin: number;
  lowestMax: number;
  rateMedian: number | null; // 단지별 1순위 경쟁률 중앙값
  lowestScores: number[];  // 단지별 최저 당첨가점 (오름차순)
}

export const HISTORY_MONTHS = 12;
export const MIN_SAMPLES = 3;

const str = (v: ApiRow[string]) => String(v ?? '').trim();
const num = (v: ApiRow[string]) => parseInt(str(v).replace(/,/g, ''), 10) || 0;

// "7.28" · "1,234.5" → 경쟁률, "(△1)" → 미달 1세대, "-" 등 → null
export function parseCompetitionRate(raw: ApiRow[string]): { rate: number } | { shortfall: number } | null {
  const s = str(raw).replace(/,/g, '');
  const short = s.match(/^\(\s*△\s*(\d+)\s*\)$/);
  if (short) return { shortfall: parseInt(short[1], 10) };
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return { rate: parseFloat(s) };
}

// 가점은 1~84점만 유효. "0"은 추첨·미달·미집계라 제외한다.
export function parseWinningScore(raw: ApiRow[string]): number | null {
  const s = str(raw);
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const score = parseFloat(s);
  return score > 0 && score <= 84 ? score : null;
}

// 거주지역 필드가 구현마다 코드(RESIDE_SECD '01')나 이름(RESIDE_SENM '해당지역')으로 와서 둘 다 본다
export function isLocalResidence(row: ApiRow): boolean {
  return str(row.RESIDE_SECD) === '01' || str(row.RESIDE_SENM) === '해당지역';
}

function groupByType(rows: ApiRow[]): Map<string, ApiRow[]> {
  const map = new Map<string, ApiRow[]>();
  for (const row of rows) {
    const type = str(row.HOUSE_TY);
    if (!type) continue;
    map.set(type, [...(map.get(type) ?? []), row]);
  }
  return map;
}

// 주택형별: 1순위 해당지역 경쟁률(없으면 1순위 다른 지역), 해당지역 당첨가점(없으면 다른 지역)
export function buildUnitResults(
  competitionRows: ApiRow[],
  scoreRows: ApiRow[],
  areaOf: (houseType: string) => number | null,
): UnitResult[] {
  const competition = groupByType(competitionRows);
  const scores = groupByType(scoreRows);
  const types = [...new Set([...competition.keys(), ...scores.keys()])].sort();

  return types.map((houseType) => {
    const firstRank = (competition.get(houseType) ?? []).filter((r) => num(r.SUBSCRPT_RANK_CODE) === 1);
    const comp = firstRank.find(isLocalResidence) ?? firstRank[0];
    const parsedRate = comp ? parseCompetitionRate(comp.CMPET_RATE) : null;

    const typeScores = scores.get(houseType) ?? [];
    const withScore = typeScores.filter((r) => parseWinningScore(r.LWET_SCORE) !== null);
    const score = withScore.find(isLocalResidence) ?? withScore[0];

    return {
      houseType,
      area: areaOf(houseType),
      supply: comp ? num(comp.SUPLY_HSHLDCO) : 0,
      requests: comp ? num(comp.REQ_CNT) : 0,
      rate: parsedRate && 'rate' in parsedRate ? parsedRate.rate : null,
      shortfall: parsedRate && 'shortfall' in parsedRate ? parsedRate.shortfall : null,
      lowest: score ? parseWinningScore(score.LWET_SCORE) : null,
      average: score ? parseWinningScore(score.AVRG_SCORE) : null,
      top: score ? parseWinningScore(score.TOP_SCORE) : null,
    };
  });
}

export function areaBucket(area: number): AreaBucket {
  if (area <= 60) return 'small';
  if (area <= 85) return 'mid';
  return 'large';
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// 단지별·면적대별 대표값(가장 낮았던 당첨선, 1순위 경쟁률)을 모아 면적대 통계를 만든다
export function buildBucketStats(complexes: UnitResult[][]): BucketStats[] {
  const buckets: AreaBucket[] = ['small', 'mid', 'large'];
  return buckets.flatMap((bucket) => {
    const lowestScores: number[] = [];
    const rates: number[] = [];
    for (const units of complexes) {
      const inBucket = units.filter((u) => u.area !== null && areaBucket(u.area) === bucket);
      const lows = inBucket.map((u) => u.lowest).filter((s): s is number => s !== null);
      if (lows.length > 0) lowestScores.push(Math.min(...lows));
      const supply = inBucket.reduce((acc, u) => acc + u.supply, 0);
      const requests = inBucket.reduce((acc, u) => acc + u.requests, 0);
      if (supply > 0 && requests > 0) rates.push(requests / supply);
    }
    if (lowestScores.length === 0) return [];
    lowestScores.sort((a, b) => a - b);
    return [{
      bucket,
      complexCount: lowestScores.length,
      lowestMedian: round1(median(lowestScores)),
      lowestMin: lowestScores[0],
      lowestMax: lowestScores[lowestScores.length - 1],
      rateMedian: rates.length > 0 ? round1(median(rates)) : null,
      lowestScores,
    }];
  });
}

export type ChanceLevel = 'high' | 'fair' | 'low' | 'veryLow' | 'unknown';

export interface Chance {
  level: ChanceLevel;
  passCount: number; // 내 가점 ≥ 최저 당첨가점이었던 단지 수
  total: number;
}

export const CHANCE_META: Record<ChanceLevel, { label: string; style: string }> = {
  high: { label: '가능성 높음', style: 'bg-green-100 text-green-700' },
  fair: { label: '도전해볼 만함', style: 'bg-yellow-100 text-yellow-700' },
  low: { label: '쉽지 않음', style: 'bg-gray-100 text-gray-600' },
  veryLow: { label: '가점제로는 어려움', style: 'bg-red-50 text-red-500' },
  unknown: { label: '표본 부족', style: 'bg-white text-gray-400 border border-gray-200' },
};

// 최근 단지 중 내 가점이 당첨선 이상이었던 비율로 판정 (법정 기준이 아닌 참고용)
export function judgeChance(myScore: number, stats: Pick<BucketStats, 'lowestScores'>): Chance {
  const total = stats.lowestScores.length;
  const passCount = stats.lowestScores.filter((s) => myScore >= s).length;
  if (total < MIN_SAMPLES) return { level: 'unknown', passCount, total };
  const ratio = passCount / total;
  const level: ChanceLevel = ratio >= 0.7 ? 'high' : ratio >= 0.4 ? 'fair' : passCount > 0 ? 'low' : 'veryLow';
  return { level, passCount, total };
}

// 이 공고 실제 결과에서 내 가점이 당첨선 이상인 주택형
export function passedUnits(myScore: number, units: UnitResult[]): UnitResult[] {
  return units.filter((u) => u.lowest !== null && myScore >= u.lowest);
}

// 판정 결과 → 다음에 해볼 만한 제안
export function getChanceSuggestions(
  myScore: number,
  stats: BucketStats[],
  specialSupply?: SpecialSupplyEligibility,
): string[] {
  const suggestions: string[] = [];
  const judged = stats.map((s) => ({ stats: s, chance: judgeChance(myScore, s) }));
  const known = judged.filter((j) => j.chance.level !== 'unknown');
  const good = known.filter((j) => j.chance.level === 'high' || j.chance.level === 'fair');
  const weak = known.filter((j) => j.chance.level === 'low' || j.chance.level === 'veryLow');

  if (good.length > 0 && weak.length > 0) {
    const names = good.map((j) => AREA_BUCKET_LABEL[j.stats.bucket]).join(', ');
    suggestions.push(`${names} 주택형이 내 가점으로 상대적으로 유리했어요`);
  }
  if (weak.length > 0) {
    const gap = Math.ceil(Math.min(...weak.map((j) => j.stats.lowestMedian)) - myScore);
    if (gap > 0) suggestions.push(`당첨선 중앙값까지 약 ${gap}점 부족해요 — 무주택 기간·통장 가입 기간이 늘면 매년 점수가 올라요`);
    suggestions.push('85㎡ 초과나 비규제지역 단지는 추첨제 물량이 있어 가점이 낮아도 기회가 있어요');
  }
  const specials = specialSupply
    ? [specialSupply.newlyWed && '신혼부부', specialSupply.firstHome && '생애최초', specialSupply.multiChild && '다자녀'].filter(Boolean)
    : [];
  if (specials.length > 0 && weak.length > 0) {
    suggestions.push(`${specials.join('·')} 특별공급 자격이 있어요 — 가점과 별개로 뽑으니 함께 노려보세요`);
  }
  if (known.length > 0 && known.every((j) => j.chance.level === 'high')) {
    suggestions.push('최근 당첨선 기준으로 경쟁력이 있는 편이에요 — 일정에 맞춰 1순위로 신청하세요');
  } else if (known.length > 0 && weak.length === 0) {
    suggestions.push('당첨선 근처라 단지마다 결과가 갈렸어요 — 인기 주택형보다 경쟁률이 낮은 주택형을 함께 살펴보세요');
  }
  return suggestions;
}
