import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db, describeDbError } from '@/lib/db';
import { subscriptionScores } from '@/lib/db/schema';

const SCORE_FIELDS = ['totalScore', 'housingScore', 'dependentScore', 'subscriptionScore'] as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { totalScore, housingScore, dependentScore, subscriptionScore, tier, specialSupply, inputSnapshot } = body;

  // integer 컬럼이라 정수가 아니면 DB 오류(500)가 되므로 미리 400으로 돌려준다
  if (!SCORE_FIELDS.every((k) => Number.isInteger(body[k]) && (body[k] as number) >= 0)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    const [row] = await db.insert(subscriptionScores).values({
      userId: session.id,
      totalScore: totalScore as number,
      housingScore: housingScore as number,
      dependentScore: dependentScore as number,
      subscriptionScore: subscriptionScore as number,
      tier: typeof tier === 'string' ? tier : '',
      specialSupply: specialSupply ?? {},
      inputSnapshot: inputSnapshot ?? {},
    }).returning({ id: subscriptionScores.id, createdAt: subscriptionScores.createdAt });

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('[db] POST /api/scores failed:', describeDbError(err));
    return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });
  }
}
