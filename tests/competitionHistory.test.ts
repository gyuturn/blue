import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBucketStats,
  buildSpecialResults,
  buildSpecialStats,
  buildUnitResults,
  defaultSupplyTab,
  formatCompetitionRate,
  getChanceSuggestions,
  judgeChance,
  parseCompetitionRate,
  parseWinningScore,
  type UnitResult,
} from '../lib/competitionHistory.ts';

const areaOf = (t: string) => parseFloat(t) || null;

test('경쟁률 문자열을 파싱한다', () => {
  assert.deepEqual(parseCompetitionRate('7.28'), { rate: 7.28 });
  assert.deepEqual(parseCompetitionRate('1,234.5'), { rate: 1234.5 });
  assert.deepEqual(parseCompetitionRate('(△3)'), { shortfall: 3 });
  assert.equal(parseCompetitionRate('-'), null);
  assert.equal(parseCompetitionRate(undefined), null);
});

test('당첨가점은 1~84점만 유효하다 ("0"은 추첨·미달)', () => {
  assert.equal(parseWinningScore('64'), 64);
  assert.equal(parseWinningScore(57), 57);
  assert.equal(parseWinningScore('0'), null);
  assert.equal(parseWinningScore('85'), null);
  assert.equal(parseWinningScore('-'), null);
});

test('주택형별로 1순위 해당지역 경쟁률과 해당지역 당첨가점을 고른다', () => {
  const competition = [
    { HOUSE_TY: '084.9800A', SUBSCRPT_RANK_CODE: 1, RESIDE_SENM: '기타지역', SUPLY_HSHLDCO: 100, REQ_CNT: '9000', CMPET_RATE: '-' },
    { HOUSE_TY: '084.9800A', SUBSCRPT_RANK_CODE: 1, RESIDE_SENM: '해당지역', SUPLY_HSHLDCO: 100, REQ_CNT: '2,500', CMPET_RATE: '25' },
    { HOUSE_TY: '084.9800A', SUBSCRPT_RANK_CODE: 2, RESIDE_SECD: '01', SUPLY_HSHLDCO: 100, REQ_CNT: '0', CMPET_RATE: '-' },
    { HOUSE_TY: '114.9000', SUBSCRPT_RANK_CODE: '1', RESIDE_SECD: '01', SUPLY_HSHLDCO: 10, REQ_CNT: '8', CMPET_RATE: '(△2)' },
  ];
  const scores = [
    { HOUSE_TY: '084.9800A', RESIDE_SECD: '02', LWET_SCORE: '50', AVRG_SCORE: '55', TOP_SCORE: '60' },
    { HOUSE_TY: '084.9800A', RESIDE_SECD: '01', LWET_SCORE: '64', AVRG_SCORE: '68.2', TOP_SCORE: '79' },
    { HOUSE_TY: '114.9000', RESIDE_SECD: '01', LWET_SCORE: '0', AVRG_SCORE: '0', TOP_SCORE: '0' },
  ];
  assert.deepEqual(buildUnitResults(competition, scores, areaOf), [
    { houseType: '084.9800A', area: 84.98, supply: 100, requests: 2500, rate: 25, shortfall: null, lowest: 64, average: 68.2, top: 79 },
    { houseType: '114.9000', area: 114.9, supply: 10, requests: 8, rate: null, shortfall: 2, lowest: null, average: null, top: null },
  ]);
});

const unit = (area: number, lowest: number | null, supply = 10, requests = 100): UnitResult => ({
  houseType: String(area), area, supply, requests, rate: null, shortfall: null, lowest, average: null, top: null,
});

test('단지별로 면적대의 가장 낮은 당첨선을 모아 통계를 낸다', () => {
  const stats = buildBucketStats([
    [unit(59, 40), unit(84, 60), unit(84.9, 55, 10, 300)],
    [unit(84, 70)],
    [unit(74, 50, 20, 100), unit(120, null)],
  ]);
  assert.deepEqual(stats, [
    { bucket: 'small', complexCount: 1, lowestMedian: 40, lowestMin: 40, lowestMax: 40, rateMedian: 10, lowestScores: [40] },
    { bucket: 'mid', complexCount: 3, lowestMedian: 55, lowestMin: 50, lowestMax: 70, rateMedian: 10, lowestScores: [50, 55, 70] },
  ]);
});

test('내 가점이 당첨선 이상이었던 단지 비율로 판정한다', () => {
  const lowestScores = [40, 50, 60, 70, 80];
  assert.equal(judgeChance(75, { lowestScores }).level, 'high');   // 4/5
  assert.equal(judgeChance(60, { lowestScores }).level, 'fair');   // 3/5
  assert.equal(judgeChance(45, { lowestScores }).level, 'low');    // 1/5
  assert.equal(judgeChance(30, { lowestScores }).level, 'veryLow');
  assert.deepEqual(judgeChance(84, { lowestScores: [40, 50] }), { level: 'unknown', passCount: 2, total: 2 });
});

test('불리한 면적대가 있으면 부족한 점수·추첨제·특공을 제안한다', () => {
  const stats = buildBucketStats([[unit(59, 40), unit(84, 60)], [unit(59, 42), unit(84, 65)], [unit(59, 45), unit(84, 70)]]);
  const suggestions = getChanceSuggestions(50, stats, { newlyWed: true, firstHome: false, multiChild: false });
  assert.equal(suggestions[0], '60㎡ 이하 주택형이 내 가점으로 상대적으로 유리했어요');
  assert.ok(suggestions.some((s) => s.includes('약 15점 부족')));
  assert.ok(suggestions.some((s) => s.startsWith('신혼부부 특별공급')));
  assert.deepEqual(getChanceSuggestions(80, stats), ['최근 당첨선 기준으로 경쟁력이 있는 편이에요 — 일정에 맞춰 1순위로 신청하세요']);
  // 모두 '도전해볼 만함'이면 확신하는 문구를 쓰지 않는다
  assert.ok(!getChanceSuggestions(65, stats).some((s) => s.includes('경쟁력이 있는 편')));
});

test('빈 데이터·경계값·면적 없는 주택형을 안전하게 처리한다', () => {
  assert.deepEqual(buildBucketStats([]), []);
  assert.deepEqual(buildBucketStats([[unit(84, null)]]), []);
  const noArea = { ...unit(84, 50), area: null };
  assert.deepEqual(buildBucketStats([[noArea]]), []);
  const edges = buildBucketStats([[unit(60, 30), unit(85, 40), unit(85.01, 50)]]);
  assert.deepEqual(edges.map((s) => [s.bucket, s.lowestMin]), [['small', 30], ['mid', 40], ['large', 50]]);
  assert.deepEqual(getChanceSuggestions(50, []), []);
});

test('1 미만 경쟁률은 미달로 표시한다', () => {
  assert.equal(formatCompetitionRate(0.5), '미달');
  assert.equal(formatCompetitionRate(0), '미달');
  assert.equal(formatCompetitionRate(1), '1 : 1');
  assert.equal(formatCompetitionRate(64.4), '64.4 : 1');
});

test('미달 중앙값은 반올림으로 1이 되지 않는다', () => {
  const u = (supply: number, requests: number): UnitResult => ({ ...unit(59, 40, supply, requests) });
  const [stats] = buildBucketStats([[u(100, 96)], [u(100, 97)], [u(100, 98)]]);
  assert.equal(stats.rateMedian, 0.9);
});

test('특별공급 신청현황을 유형별·주택형별로 합산한다', () => {
  const rows = [
    {
      HOUSE_TY: '084.9800A', LFE_FRST_HSHLDCO: '4', CRSPAREA_LFE_FRST_CNT: '60', CTPRVN_LFE_FRST_CNT: '20', ETC_AREA_LFE_FRST_CNT: '8',
      NWWDS_NMTW_HSHLDCO: 6, CRSPAREA_NWWDS_NMTW_CNT: 3, CTPRVN_NWWDS_NMTW_CNT: 0, ETC_AREA_NWWDS_NMTW_CNT: 1,
      MNYCH_HSHLDCO: 0, CRSPAREA_MNYCH_CNT: 0,
      INSTT_RECOMEND_HSHLDCO: 2, INSTT_RECOMEND_DCSN_CNT: 2, INSTT_RECOMEND_PREPAR_CNT: 5,
    },
    { HOUSE_TY: '059.9900B', LFE_FRST_HSHLDCO: '2', CRSPAREA_LFE_FRST_CNT: '1,000', CTPRVN_LFE_FRST_CNT: null, ETC_AREA_LFE_FRST_CNT: '' },
  ];
  const results = buildSpecialResults(rows);
  assert.deepEqual(results.map((r) => r.type), ['firstHome', 'newlyWed', 'institution']);

  const first = results[0];
  assert.equal(first.supply, 6);
  assert.equal(first.requests, 1088);
  assert.equal(first.localRequests, 1060);
  assert.equal(first.rate, 181.3);
  assert.deepEqual(first.units.map((u) => [u.houseType, u.supply, u.requests, u.rate]), [
    ['059.9900B', 2, 1000, 500],
    ['084.9800A', 4, 88, 22],
  ]);

  // 신청이 배정보다 적으면 1 미만 → '미달'로 표시된다 (반올림으로 1이 되지 않음)
  const wed = results[1];
  assert.equal(wed.requests, 4);
  assert.equal(wed.rate, 0.6);
  assert.equal(formatCompetitionRate(wed.rate!), '미달');

  // 기관추천은 예비자 접수를 빼고, 지역 구분이 없다
  const inst = results[2];
  assert.equal(inst.requests, 2);
  assert.equal(inst.localRequests, null);
});

test('접수가 없으면 경쟁률은 null', () => {
  const [r] = buildSpecialResults([{ HOUSE_TY: '084A', MNYCH_HSHLDCO: 3 }]);
  assert.equal(r.type, 'multiChild');
  assert.equal(r.rate, null);
  assert.deepEqual(buildSpecialResults([]), []);
});

test('특별공급 지역 통계는 접수가 있는 단지의 유형별 경쟁률 중앙값', () => {
  const mk = (supply: number, requests: number) =>
    [{ type: 'firstHome' as const, supply, requests, localRequests: requests, rate: null, units: [] }];
  const stats = buildSpecialStats([mk(10, 50), mk(10, 300), mk(10, 5), mk(10, 0)]);
  assert.equal(stats.length, 1);
  assert.equal(stats[0].type, 'firstHome');
  assert.equal(stats[0].complexCount, 3);
  assert.equal(stats[0].rateMedian, 5);
  assert.equal(stats[0].rateMin, 0.5);
  assert.equal(stats[0].rateMax, 30);
  assert.deepEqual(buildSpecialStats([]), []);
});

test('기본 탭은 내 자격 유형 중 데이터가 있는 첫 유형', () => {
  const none = { newlyWed: false, firstHome: false, multiChild: false };
  assert.equal(defaultSupplyTab(['firstHome', 'newlyWed'], undefined), 'general');
  assert.equal(defaultSupplyTab(['firstHome', 'newlyWed'], none), 'general');
  assert.equal(defaultSupplyTab(['firstHome', 'newlyWed'], { ...none, newlyWed: true }), 'newlyWed');
  assert.equal(defaultSupplyTab(['newlyWed'], { ...none, firstHome: true, newlyWed: true }), 'newlyWed');
  assert.equal(defaultSupplyTab(['newlyWed'], { ...none, multiChild: true }), 'general');
});
