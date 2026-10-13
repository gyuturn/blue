import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_REGION, INITIAL_REGION, REGION_OPTIONS, getRegionQuery } from '../lib/regions.ts';

test('공고 화면은 항상 전체 지역으로 시작한다', () => {
  assert.equal(INITIAL_REGION, ALL_REGION);
  assert.equal(REGION_OPTIONS[0], INITIAL_REGION);
});

test('전체 지역은 region 파라미터 없이 조회한다', () => {
  assert.equal(getRegionQuery(INITIAL_REGION), '');
});

test('특정 지역은 region 파라미터를 인코딩해 붙인다', () => {
  assert.equal(getRegionQuery('경기도'), `?region=${encodeURIComponent('경기도')}`);
});
