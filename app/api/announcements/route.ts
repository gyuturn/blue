import { NextResponse } from 'next/server';
import type { Announcement } from '@/types';
import {
  fetchAnnouncementsFromAPI,
  getSubscriptionStatus,
  MOCK_ANNOUNCEMENTS,
} from '@/lib/announcements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') ?? undefined;
  const statusFilter = searchParams.get('status') ?? undefined;

  // 공공데이터 API 시도
  const apiData = await fetchAnnouncementsFromAPI(region);

  let announcements: Announcement[];
  let isMock: boolean;

  if (apiData.length > 0) {
    announcements = apiData;
    isMock = false;
  } else {
    // Mock 데이터 사용
    announcements = region
      ? MOCK_ANNOUNCEMENTS.filter((a) => a.region.includes(region))
      : MOCK_ANNOUNCEMENTS;
    isMock = true;
  }

  // status 필드 자동 계산 (아직 없는 항목에 한해)
  announcements = announcements.map((a) => {
    if (a.status) return a;
    const computed = getSubscriptionStatus(a.subscriptionStartDate, a.subscriptionEndDate);
    return {
      ...a,
      status: computed === '일정미정' ? undefined : computed,
    };
  });

  // status 쿼리 필터 적용
  if (statusFilter) {
    announcements = announcements.filter(
      (a) => a.status === statusFilter,
    );
  }

  return NextResponse.json({
    data: announcements,
    total: announcements.length,
    isMock,
  });
}
