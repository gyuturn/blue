import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateMarketPrice, parseTradesXml, parseUnitArea, recentMonths, type AptTrade } from '../lib/marketPrice.ts';

const item = (fields: Record<string, string>) =>
  `<item>${Object.entries(fields).map(([k, v]) => `<${k}>${v}</${k}>`).join('')}</item>`;

test('실거래 XML을 파싱하고 해제 거래는 제외한다', () => {
  const xml = `<response><header><resultCode>000</resultCode></header><body><items>
    ${item({ aptNm: '경희궁자이(2단지)', umdNm: '홍파동', excluUseAr: '59.8547', dealAmount: '236,500', buildYear: '2017', dealYear: '2026', dealMonth: '9', dealDay: '28', cdealType: ' ' })}
    ${item({ aptNm: '취소단지', umdNm: '홍파동', excluUseAr: '84.9', dealAmount: '100,000', buildYear: '2017', dealYear: '2026', dealMonth: '9', dealDay: '1', cdealType: 'O' })}
  </items><totalCount>32</totalCount></body></response>`;
  const { trades, totalCount } = parseTradesXml(xml);
  assert.equal(totalCount, 32);
  assert.deepEqual(trades, [
    { aptNm: '경희궁자이(2단지)', umdNm: '홍파동', area: 59.8547, price: 236500, buildYear: 2017, dealDate: '2026-09-28' },
  ]);
});

test('주택형 코드에서 전용면적을 꺼낸다', () => {
  assert.equal(parseUnitArea('084.9800A'), 84.98);
  assert.equal(parseUnitArea(' 059.7421B'), 59.7421);
  assert.equal(parseUnitArea('기타'), null);
});

test('최근 6개월을 한국 시간 기준으로 만든다 (연도 경계 포함)', () => {
  // UTC 1월 31일 16시 = KST 2월 1일
  assert.deepEqual(recentMonths(new Date('2026-01-31T16:00:00Z'), 3), ['202602', '202601', '202512']);
  assert.deepEqual(recentMonths(new Date('2026-03-15T00:00:00Z')).length, 6);
});

const t = (umdNm: string, area: number, price: number, buildYear: number, aptNm = 'x', dealDate = '2026-09-01'): AptTrade =>
  ({ aptNm, umdNm, area, price, buildYear, dealDate });

test('같은 동·신축 거래가 3건 이상이면 그것만으로 ㎡당 중위값 × 면적', () => {
  const trades = [
    t('홍파동', 84, 84000, 2020), // 1000/㎡
    t('홍파동', 85, 102000, 2021), // 1200/㎡
    t('홍파동', 80, 88000, 2019), // 1100/㎡
    t('홍파동', 84, 50000, 1990), // 구축 — 제외
    t('사직동', 84, 200000, 2022), // 다른 동 — 제외
    t('홍파동', 59, 70000, 2020), // 면적 차이 — 제외
  ];
  const r = estimateMarketPrice(trades, 84.98, '홍파동', 2026);
  assert.equal(r?.estimate, Math.round(1100 * 84.98));
  assert.equal(r?.count, 3);
  assert.equal(r?.dong, '홍파동');
  assert.equal(r?.newOnly, true);
  assert.equal(r?.medianBuildYear, 2020);
});

test('같은 동 신축이 부족하면 시군구 신축 → 같은 동 구축 → 시군구 순으로 넓힌다', () => {
  const sameDong = [t('홍파동', 84, 84000, 2020), t('홍파동', 84, 84000, 1990), t('홍파동', 84, 84000, 1995)];
  assert.equal(estimateMarketPrice(sameDong, 84, '홍파동', 2026)?.newOnly, false);
  assert.equal(estimateMarketPrice(sameDong, 84, '홍파동', 2026)?.dong, '홍파동');
  assert.equal(estimateMarketPrice(sameDong, 84, '홍파동', 2026)?.medianBuildYear, 1995);

  // 같은 동에 구축만 있고 시군구에 신축이 있으면 신축을 먼저 쓴다
  const mixed = [...sameDong, t('사직동', 84, 120000, 2021), t('평동', 84, 120000, 2022)];
  const m = estimateMarketPrice(mixed, 84, '홍파동', 2026);
  assert.equal(m?.newOnly, true);
  assert.equal(m?.dong, undefined);

  const sgg = [t('사직동', 84, 84000, 2020), t('평동', 84, 84000, 2021), t('홍파동', 84, 84000, 2022)];
  const r = estimateMarketPrice(sgg, 84, '홍파동', 2026);
  assert.equal(r?.dong, undefined);
  assert.equal(r?.newOnly, true);
});

test('읍·면 지역은 "봉담읍 동화리"처럼 와도 같은 읍으로 본다', () => {
  const trades = [t('봉담읍 동화리', 84, 50000, 2022), t('봉담읍 동화리', 84, 50000, 2022), t('봉담읍 상리', 84, 50000, 2022)];
  assert.equal(estimateMarketPrice(trades, 84, '봉담읍', 2026)?.dong, '봉담읍');
});

test('비교 거래가 3건 미만이면 null', () => {
  assert.equal(estimateMarketPrice([t('홍파동', 84, 84000, 2020), t('홍파동', 84, 84000, 2020)], 84, '홍파동', 2026), null);
  assert.equal(estimateMarketPrice([], 84, undefined, 2026), null);
});

test('비교 단지를 거래 많은 순으로 최근 거래와 함께 요약한다', () => {
  const trades = [
    t('홍파동', 84, 90000, 2020, 'A단지', '2026-07-01'),
    t('홍파동', 84, 95000, 2020, 'A단지', '2026-09-10'),
    t('홍파동', 83, 88000, 2021, 'B단지', '2026-08-01'),
  ];
  assert.deepEqual(estimateMarketPrice(trades, 84, '홍파동', 2026)?.complexes, [
    { name: 'A단지', dong: '홍파동', buildYear: 2020, area: 84, price: 95000, dealDate: '2026-09-10', count: 2 },
    { name: 'B단지', dong: '홍파동', buildYear: 2021, area: 83, price: 88000, dealDate: '2026-08-01', count: 1 },
  ]);
});
