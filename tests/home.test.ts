import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowAnnouncementsAsHome } from '../lib/home.ts';

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
