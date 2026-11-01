import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_REGION, INITIAL_REGION, REGION_OPTIONS, getRegionQuery, toRegionOption } from '../lib/regions.ts';

test('공고 화면은 위치 확인 전까지 전체 지역으로 시작한다', () => {
  assert.equal(INITIAL_REGION, ALL_REGION);
  assert.equal(REGION_OPTIONS[0], INITIAL_REGION);
});

test('전체 지역은 region 파라미터 없이 조회한다', () => {
  assert.equal(getRegionQuery(INITIAL_REGION), '');
});

test('특정 지역은 region 파라미터를 인코딩해 붙인다', () => {
  assert.equal(getRegionQuery('경기도'), `?region=${encodeURIComponent('경기도')}`);
});

test('정식 명칭은 그대로 지역 필터 값이 된다', () => {
  assert.equal(toRegionOption('경기도'), '경기도');
  assert.equal(toRegionOption('서울특별시'), '서울특별시');
  assert.equal(toRegionOption('전북특별자치도'), '전북특별자치도');
});

test('옛 명칭과 약칭을 현재 명칭으로 바꾼다', () => {
  assert.equal(toRegionOption('강원도'), '강원특별자치도');
  assert.equal(toRegionOption('전라북도'), '전북특별자치도');
  assert.equal(toRegionOption('충남'), '충청남도');
  assert.equal(toRegionOption(' 서울 '), '서울특별시');
});

test('모르는 이름이나 빈 값은 null', () => {
  assert.equal(toRegionOption(''), null);
  assert.equal(toRegionOption(undefined), null);
  assert.equal(toRegionOption('전체'), null);
  assert.equal(toRegionOption('도쿄도'), null);
});
