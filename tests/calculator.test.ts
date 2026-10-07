import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHomelessScore,
  calculateSubscriptionScore,
  formatMonthsAsPeriod,
  getSubscriptionMonths,
  startDateFromMonths,
  subscriptionScoreFromMonths,
} from '../lib/calculator.ts';

const NOW = new Date(2026, 9, 6); // 2026-10-06

test('가입기간 점수: 법령 구간 경계', () => {
  const cases: [number, number][] = [
    [0, 1], [5, 1], [6, 2], [11, 2], [12, 3], [23, 3], [24, 4],
    [30, 4], [96, 10], [121, 12], [167, 15], [168, 16], [179, 16], [180, 17], [300, 17],
  ];
  for (const [months, score] of cases) {
    assert.equal(subscriptionScoreFromMonths(months), score, `${months}개월`);
  }
});

test('토스 예시: 가입 10년 1개월 → 12점, 2년 6개월 → 4점', () => {
  assert.equal(calculateSubscriptionScore(startDateFromMonths(121, NOW), NOW), 12);
  assert.equal(calculateSubscriptionScore(startDateFromMonths(30, NOW), NOW), 4);
});

test('미입력/잘못된 값은 1점', () => {
  assert.equal(calculateSubscriptionScore('', NOW), 1);
  assert.equal(calculateSubscriptionScore('abc', NOW), 1);
  assert.equal(getSubscriptionMonths('', NOW), null);
});

test('시작월 ↔ 개월 수 변환', () => {
  assert.equal(startDateFromMonths(121, NOW), '2016-09');
  assert.equal(startDateFromMonths(0, NOW), '2026-10');
  assert.equal(getSubscriptionMonths('2016-09', NOW), 121);
  assert.equal(getSubscriptionMonths('2027-01', NOW), 0);
  assert.equal(formatMonthsAsPeriod(121), '10년 1개월');
  assert.equal(formatMonthsAsPeriod(24), '2년');
  assert.equal(formatMonthsAsPeriod(5), '5개월');
});

test('무주택 기간 점수: 1년 미만 2점, 1년마다 +2점, 15년 이상 32점', () => {
  const cases: [number, number][] = [
    [0, 2], [0.5, 2], [1, 4], [2, 6], [5, 12], [10, 22], [14, 30], [15, 32], [16, 32], [30, 32],
  ];
  for (const [years, score] of cases) {
    assert.equal(calculateHomelessScore(years), score, `${years}년`);
  }
});
