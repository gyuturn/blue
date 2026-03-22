import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscriptionScores } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { totalScore, housingScore, dependentScore, subscriptionScore, tier, specialSupply, inputSnapshot } = body;

  if (totalScore === undefined || housingScore === undefined || dependentScore === undefined || subscriptionScore === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [row] = await db.insert(subscriptionScores).values({
    userId: session.id,
    totalScore,
    housingScore,
    dependentScore,
    subscriptionScore,
    tier: tier ?? '',
    specialSupply: specialSupply ?? {},
    inputSnapshot: inputSnapshot ?? {},
  }).returning({ id: subscriptionScores.id, createdAt: subscriptionScores.createdAt });

  return NextResponse.json(row, { status: 201 });
}
