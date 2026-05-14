import { NextResponse } from 'next/server';
import { fetchHouseTypesFromAPI } from '@/lib/announcements';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const houseTypes = await fetchHouseTypesFromAPI(id);

  return NextResponse.json({ data: houseTypes });
}
