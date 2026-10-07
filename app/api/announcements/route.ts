import { NextResponse } from 'next/server';
import { loadAnnouncements } from '@/lib/announcements';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') ?? undefined;
  const statusFilter = searchParams.get('status') ?? undefined;

  const { announcements: all, isMock } = await loadAnnouncements(region);

  // status 쿼리 필터 적용
  const announcements = statusFilter ? all.filter((a) => a.status === statusFilter) : all;

  return NextResponse.json({
    data: announcements,
    total: announcements.length,
    isMock,
  });
}
