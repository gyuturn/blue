import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMapSearchUrl } from '../lib/maps.ts';

test('네이버지도 검색 URL에 주소가 인코딩되어 들어간다', () => {
  assert.equal(
    getMapSearchUrl('naver', '서울특별시 강남구 개포동 12'),
    'https://map.naver.com/p/search/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EA%B0%95%EB%82%A8%EA%B5%AC%20%EA%B0%9C%ED%8F%AC%EB%8F%99%2012',
  );
});

test('카카오맵 검색 URL에 주소가 인코딩되어 들어간다', () => {
  assert.equal(
    getMapSearchUrl('kakao', '부산광역시 해운대구 우동 1408'),
    `https://map.kakao.com/link/search/${encodeURIComponent('부산광역시 해운대구 우동 1408')}`,
  );
});

test('앞뒤 공백은 제거하고, 특수문자(/, #, &)는 인코딩한다', () => {
  const url = getMapSearchUrl('naver', '  경기도 A/B동 1#2&3  ');
  assert.equal(url, `https://map.naver.com/p/search/${encodeURIComponent('경기도 A/B동 1#2&3')}`);
  assert.ok(!url.slice('https://map.naver.com/p/search/'.length).includes('/'));
});

test('빈 주소는 null을 반환한다', () => {
  assert.equal(getMapSearchUrl('naver', ''), null);
  assert.equal(getMapSearchUrl('kakao', '   '), null);
});
