import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceScoreRedirectScript, hasDeviceScore, shouldShowAnnouncementsAsHome } from '../lib/home.ts';

const record = { input: {}, savedAt: 1 };

test('로그인 + 계정 점수가 있으면 공고목록을 메인으로 보여준다', () => {
  assert.equal(shouldShowAnnouncementsAsHome(true, { ok: true, record }), true);
});

test('로그인했지만 계정 점수가 없으면 기존 메인', () => {
  assert.equal(shouldShowAnnouncementsAsHome(true, { ok: true, record: null }), false);
});

test('점수 조회에 실패하면 기존 메인', () => {
  assert.equal(shouldShowAnnouncementsAsHome(true, { ok: false }), false);
});

test('비로그인은 기존 메인', () => {
  assert.equal(shouldShowAnnouncementsAsHome(false, null), false);
});

const KEY = 'blue_last_score_v1';

const deviceCases: [string, string | null, boolean][] = [
  ['저장된 점수', JSON.stringify({ v: 1, input: { region: '서울' }, savedAt: 1 }), true],
  ['기록 없음', null, false],
  ['빈 문자열', '', false],
  ['깨진 JSON', '{oops', false],
  ['null JSON', 'null', false],
  ['버전 다름', JSON.stringify({ v: 2, input: {}, savedAt: 1 }), false],
  ['savedAt 없음', JSON.stringify({ v: 1, input: {} }), false],
  ['input 없음', JSON.stringify({ v: 1, savedAt: 1 }), false],
  ['input이 문자열', JSON.stringify({ v: 1, input: 'x', savedAt: 1 }), false],
];

// 인라인 스크립트를 가짜 localStorage/location으로 실행해 이동했는지 돌려준다
function runScript(raw: string | null, pathname = '/'): string | null {
  let replaced: string | null = null;
  const localStorage = { getItem: (k: string) => (k === KEY ? raw : null) };
  const location = { pathname, replace: (url: string) => { replaced = url; } };
  new Function('localStorage', 'location', deviceScoreRedirectScript(KEY))(localStorage, location);
  return replaced;
}

for (const [name, raw, expected] of deviceCases) {
  test(`기기 점수 판정 — ${name}`, () => {
    assert.equal(hasDeviceScore(raw), expected);
    assert.equal(runScript(raw), expected ? '/announcements' : null);
  });
}

test('메인이 아닌 경로에서는 이동하지 않는다', () => {
  assert.equal(runScript(deviceCases[0][1], '/calculator'), null);
});

test('localStorage 접근이 막혀도 에러 없이 메인을 보여준다', () => {
  const localStorage = { getItem: () => { throw new Error('SecurityError'); } };
  const location = { pathname: '/', replace: () => assert.fail('이동하면 안 된다') };
  new Function('localStorage', 'location', deviceScoreRedirectScript(KEY))(localStorage, location);
});
