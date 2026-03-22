import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscriptionScores } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [latest] = await db
    .select()
    .from(subscriptionScores)
    .where(eq(subscriptionScores.userId, session.id))
    .orderBy(desc(subscriptionScores.createdAt))
    .limit(1);

  if (!latest) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(latest);
}
