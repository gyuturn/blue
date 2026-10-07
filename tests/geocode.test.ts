import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGeocodeQueries, isSameSido } from '../lib/geocode.ts';

test('정상 주소는 원문 한 개만 후보로 만든다', () => {
  assert.deepEqual(buildGeocodeQueries('서울특별시 강남구 개포동 12'), ['서울특별시 강남구 개포동 12']);
});

test('괄호 설명과 "일원"을 단계적으로 제거한다', () => {
  assert.deepEqual(buildGeocodeQueries('충청남도 천안시 서북구 성성동 일원 (성성지구 B-1블록)'), [
    '충청남도 천안시 서북구 성성동 일원 (성성지구 B-1블록)',
    '충청남도 천안시 서북구 성성동 일원',
    '충청남도 천안시 서북구 성성동',
  ]);
});

test('"외 N필지" 이후를 제거한다', () => {
  assert.deepEqual(buildGeocodeQueries('경기도 화성시 봉담읍 동화리 1-1번지 외 3필지'), [
    '경기도 화성시 봉담읍 동화리 1-1번지 외 3필지',
    '경기도 화성시 봉담읍 동화리 1-1번지',
  ]);
});

test('연속 공백을 정리하고 빈 주소는 후보가 없다', () => {
  assert.deepEqual(buildGeocodeQueries('  부산광역시   해운대구  우동  '), ['부산광역시 해운대구 우동']);
  assert.deepEqual(buildGeocodeQueries('   '), []);
});

test('"일원동" 같은 실제 동 이름은 지우지 않는다', () => {
  assert.deepEqual(buildGeocodeQueries('서울특별시 강남구 일원동 615'), ['서울특별시 강남구 일원동 615']);
});

test('공고 지역(정식/약칭)과 카카오 주소의 시/도를 비교한다', () => {
  assert.equal(isSameSido('충청남도', '충남 천안시 서북구 성성동'), true);
  assert.equal(isSameSido('충남', '충남 천안시 서북구 성성동'), true);
  assert.equal(isSameSido('서울특별시', '경기 성남시 분당구'), false);
  assert.equal(isSameSido('', '경기 성남시 분당구'), true);
});
