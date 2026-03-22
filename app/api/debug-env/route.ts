import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail';

async function testKey(label: string, url: string) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    return { label, status: res.status, ok: res.ok, body: text.slice(0, 200) };
  } catch (e) {
    return { label, error: String(e) };
  }
}

export async function GET() {
  const encodedKey = process.env.PUBLIC_DATA_API_KEY;
  if (!encodedKey) {
    return NextResponse.json({ error: 'PUBLIC_DATA_API_KEY not set' }, { status: 500 });
  }

  // 디코딩 키 = %2B → +, %2F → /, %3D → =
  const decodedKey = decodeURIComponent(encodedKey);

  // Case A: 인코딩 키 → URLSearchParams (이중인코딩 위험)
  const paramsA = new URLSearchParams({ page: '1', perPage: '3', returnType: 'JSON', serviceKey: encodedKey });
  // Case B: 디코딩 키 → URLSearchParams (URLSearchParams가 직접 인코딩)
  const paramsB = new URLSearchParams({ page: '1', perPage: '3', returnType: 'JSON', serviceKey: decodedKey });
  // Case C: 인코딩 키 → 쿼리스트링 직접 조합 (lib/announcements.ts 방식)
  const urlC = `${BASE_URL}?page=1&perPage=3&returnType=JSON&serviceKey=${encodedKey}`;

  const results = await Promise.all([
    testKey('A: encoded → URLSearchParams (이중인코딩)', `${BASE_URL}?${paramsA}`),
    testKey('B: decoded → URLSearchParams', `${BASE_URL}?${paramsB}`),
    testKey('C: encoded → 직접조합 (현재방식)', urlC),
  ]);

  return NextResponse.json({
    encodedKeyLength: encodedKey.length,
    decodedKeyLength: decodedKey.length,
    results,
  });
}
