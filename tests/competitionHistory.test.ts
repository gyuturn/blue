import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBucketStats,
  buildUnitResults,
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
