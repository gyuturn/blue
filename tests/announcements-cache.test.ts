import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAnnouncementsCacheControl } from '../lib/announcements.ts';

test('실데이터는 30분 캐시 + 30분 stale 허용', () => {
  assert.equal(getAnnouncementsCacheControl(false), 'public, s-maxage=1800, stale-while-revalidate=1800');
});

test('샘플 데이터(외부 API 장애)는 1분만 캐시', () => {
  assert.equal(getAnnouncementsCacheControl(true), 'public, s-maxage=60');
});
