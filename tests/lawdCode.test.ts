import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLawd } from '../lib/lawdCode.ts';

test('시/도 + 시 + 동 주소', () => {
  assert.deepEqual(resolveLawd('경기도 평택시 세교동 725번지 일원'), { lawdCds: ['41220'], dong: '세교동' });
});

test('구가 있는 시는 "시 구"로 찾고, 구가 생략되면 하위 구 전체', () => {
  assert.deepEqual(resolveLawd('경기도 수원시 영통구 이의동 1'), { lawdCds: ['41117'], dong: '이의동' });
  assert.deepEqual(resolveLawd('경기도 수원시 이의동 1')?.lawdCds.sort(), ['41111', '41113', '41115', '41117']);
});

test('서울 약칭·광역시 구', () => {
  assert.deepEqual(resolveLawd('서울 강남구 개포동 12'), { lawdCds: ['11680'], dong: '개포동' });
  assert.deepEqual(resolveLawd('서울특별시 강남구 일원동 615'), { lawdCds: ['11680'], dong: '일원동' });
});

test('특별자치도 옛 명칭과 세종', () => {
  assert.equal(resolveLawd('강원도 춘천시 온의동 1')?.lawdCds[0], '51110');
  assert.equal(resolveLawd('전라북도 전주시 완산구 효자동3가 1')?.lawdCds[0], '52111');
  assert.deepEqual(resolveLawd('세종특별자치시 산울동 6-3생활권 L1블록'), { lawdCds: ['36110'], dong: '산울동' });
});

test('읍·면 주소와 동 없는 지구 주소', () => {
  assert.deepEqual(resolveLawd('경기도 화성시 봉담읍 동화리 1-1번지 외 3필지')?.dong, '봉담읍');
  assert.deepEqual(resolveLawd('경기도 평택시 고덕국제화계획지구 A-12블록 (고덕동)'), { lawdCds: ['41220'], dong: undefined });
});

test('모르는 주소는 null', () => {
  assert.equal(resolveLawd('일원 B-1블록'), null);
  assert.equal(resolveLawd(''), null);
});

test('2026 개편: 화성 일반구, 인천 옛 구 이름, 광주·전남 통합 코드', () => {
  assert.deepEqual(resolveLawd('경기도 화성시 동탄구 오산동 1')?.lawdCds, ['41597']);
  assert.deepEqual(resolveLawd('경기도 화성시 봉담읍 동화리 1')?.lawdCds.sort(), ['41591', '41593', '41595', '41597']);
  assert.deepEqual(resolveLawd('인천광역시 중구 운서동 1'), { lawdCds: ['28125', '28155'], dong: '운서동' });
  assert.deepEqual(resolveLawd('인천광역시 검단구 마전동 1')?.lawdCds, ['28290']);
  assert.deepEqual(resolveLawd('광주광역시 북구 문흥동 1'), { lawdCds: ['12300'], dong: '문흥동' });
  assert.deepEqual(resolveLawd('전라남도 순천시 해룡면 신대리 1'), { lawdCds: ['12150'], dong: '해룡면' });
  assert.deepEqual(resolveLawd('전남광주통합특별시 광주 광산구 선암동 1')?.lawdCds, ['12330']);
});

test('경기도 광주시는 광주·전남과 헷갈리지 않는다', () => {
  assert.deepEqual(resolveLawd('경기도 광주시 오포읍 1')?.lawdCds, ['41610']);
});
