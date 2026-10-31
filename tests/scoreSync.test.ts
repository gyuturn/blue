import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveScoreToAccount } from '../lib/scoreSync.ts';
import { dbErrorCode, dbHealthHint } from '../lib/dbHealth.ts';

function fakeFetch(responses: Array<number | Error>) {
  const calls: number[] = [];
  const impl = (async () => {
    const next = responses[calls.length];
    calls.push(calls.length);
    if (next instanceof Error) throw next;
    return new Response(null, { status: next });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const opts = (impl: typeof fetch) => ({ fetchImpl: impl, retryDelayMs: 0 });

test('바로 저장되면 saved', async () => {
  const f = fakeFetch([201]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'saved');
  assert.equal(f.calls.length, 1);
});

test('503 한 번은 재시도해서 저장한다', async () => {
  const f = fakeFetch([503, 201]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'saved');
  assert.equal(f.calls.length, 2);
});

test('네트워크 오류도 재시도한다', async () => {
  const f = fakeFetch([new TypeError('fetch failed'), 201]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'saved');
});

test('재시도해도 실패하면 failed', async () => {
  const f = fakeFetch([503, 500]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'failed');
  assert.equal(f.calls.length, 2);
});

test('401은 재시도 없이 expired', async () => {
  const f = fakeFetch([401]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'expired');
  assert.equal(f.calls.length, 1);
});

test('재시도 중 401이면 expired', async () => {
  const f = fakeFetch([503, 401]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'expired');
});

test('400은 다시 보내도 같으므로 재시도하지 않는다', async () => {
  const f = fakeFetch([400]);
  assert.equal(await saveScoreToAccount('{}', opts(f.impl)), 'failed');
  assert.equal(f.calls.length, 1);
});

test('drizzle이 감싼 오류에서 코드를 꺼낸다', () => {
  assert.equal(dbErrorCode({ cause: { code: '42P01' } }), '42P01');
  assert.equal(dbErrorCode({ code: 'ENOTFOUND' }), 'ENOTFOUND');
  assert.equal(dbErrorCode(new Error('x')), 'unknown');
});

test('알려진 코드는 조치 안내, 모르는 코드는 로그 안내', () => {
  assert.match(dbHealthHint('42P01'), /drizzle-kit push/);
  assert.match(dbHealthHint('ENOTFOUND'), /pooler/);
  assert.match(dbHealthHint('unknown'), /Vercel 로그/);
});
