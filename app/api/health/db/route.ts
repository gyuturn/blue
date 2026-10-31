import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, describeDbError } from '@/lib/db';
import { dbErrorCode, dbHealthHint } from '@/lib/dbHealth';

export const dynamic = 'force-dynamic';

// 운영 DB 진단: 오류 코드와 조치 안내만 돌려주고, 메시지(호스트 등)는 로그에만 남긴다
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, code: 'missing_url', hint: dbHealthHint('missing_url') }, { status: 503 });
  }
  try {
    await db.execute(sql`select 1 from subscription_scores limit 1`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[db] GET /api/health/db failed:', describeDbError(err));
    const code = dbErrorCode(err);
    return NextResponse.json({ ok: false, code, hint: dbHealthHint(code) }, { status: 503 });
  }
}
