import { NextResponse } from 'next/server';
import type { Announcement } from '@/types';

// Mock 데이터 - API 키 없이도 동작
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'mock-001',
    complexName: '서울 강남 래미안 센트럴',
    builder: '삼성물산',
    region: '서울특별시',
    announcementDate: '2026-02-10',
    subscriptionStartDate: '2026-02-24',
    subscriptionEndDate: '2026-02-26',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-002',
    complexName: '경기 판교 힐스테이트',
    builder: '현대엔지니어링',
    region: '경기도',
    announcementDate: '2026-02-12',
    subscriptionStartDate: '2026-02-28',
    subscriptionEndDate: '2026-03-04',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-003',
    complexName: '부산 해운대 더샵 마리나',
    builder: '포스코이앤씨',
    region: '부산광역시',
    announcementDate: '2026-02-14',
    subscriptionStartDate: '2026-03-03',
    subscriptionEndDate: '2026-03-05',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-004',
    complexName: '인천 송도 자이 더 스타',
    builder: 'GS건설',
    region: '인천광역시',
    announcementDate: '2026-02-17',
    subscriptionStartDate: '2026-03-10',
    subscriptionEndDate: '2026-03-12',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-005',
    complexName: '대구 수성 e편한세상',
    builder: 'DL이앤씨',
    region: '대구광역시',
    announcementDate: '2026-02-18',
    subscriptionStartDate: '2026-03-17',
    subscriptionEndDate: '2026-03-19',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-006',
    complexName: '경기 의정부 한양수자인',
    builder: '한양',
    region: '경기도',
    announcementDate: '2026-02-19',
    subscriptionStartDate: '2026-03-24',
    subscriptionEndDate: '2026-03-26',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-007',
    complexName: '세종 행복도시 국민임대',
    builder: 'LH한국토지주택공사',
    region: '세종특별자치시',
    announcementDate: '2026-02-20',
    subscriptionStartDate: '2026-03-04',
    subscriptionEndDate: '2026-03-06',
    houseType: '공공임대',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
  {
    id: 'mock-008',
    complexName: '광주 첨단 아이파크',
    builder: 'HDC현대산업개발',
    region: '광주광역시',
    announcementDate: '2026-02-21',
    subscriptionStartDate: '2026-03-18',
    subscriptionEndDate: '2026-03-20',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
  },
];

async function fetchFromPublicAPI(region?: string): Promise<Announcement[]> {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const baseUrl =
      'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail';
    const params = new URLSearchParams({
      page: '1',
      perPage: '20',
      serviceKey: apiKey,
      returnType: 'JSON',
    });
    if (region) {
      params.append('SUBSCRPT_AREA_CODE_NM', region);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      next: { revalidate: 3600 }, // 1시간 캐시
    });

    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    const items = json?.data ?? [];

    return items.map(
      (item: Record<string, string>, idx: number): Announcement => ({
        id: item.HOUSE_MANAGE_NO ?? `api-${idx}`,
        complexName: item.HOUSE_NM ?? '단지명 없음',
        builder: item.BSNS_MBY_NM ?? '건설사 없음',
        region: item.SUBSCRPT_AREA_CODE_NM ?? '',
        announcementDate: item.RCRIT_PBLANC_DE ?? '',
        subscriptionStartDate: item.SUBSCRPT_RCPT_BGNDE ?? '',
        subscriptionEndDate: item.SUBSCRPT_RCPT_ENDDE ?? '',
        houseType: item.HOUSE_SECD_NM ?? '민영주택',
        pdfUrl: item.PBLANC_URL,
      }),
    );
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') ?? undefined;

  // 공공데이터 API 시도
  const apiData = await fetchFromPublicAPI(region);

  let announcements: Announcement[];
  if (apiData.length > 0) {
    announcements = apiData;
  } else {
    // Mock 데이터 사용
    announcements = region
      ? MOCK_ANNOUNCEMENTS.filter((a) => a.region.includes(region))
      : MOCK_ANNOUNCEMENTS;
  }

  return NextResponse.json({
    data: announcements,
    total: announcements.length,
    isMock: apiData.length === 0,
  });
}
