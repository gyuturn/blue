import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { favorites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, session.id))
    .orderBy(favorites.createdAt);

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { houseManageNo, complexName, region } = body;

  if (!houseManageNo || !complexName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [row] = await db
    .insert(favorites)
    .values({ userId: session.id, houseManageNo, complexName, region })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ data: row }, { status: 201 });
}
