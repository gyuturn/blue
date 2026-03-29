import type { Announcement, EligibilityInput, SpecialSupplyEligibility, SubscriptionStatus } from '@/types';

// API 응답 날짜는 이미 YYYY-MM-DD 형식으로 반환됨
function formatDate(date: string): string {
  return date ?? '';
}

// 접수 상태 계산
export function getSubscriptionStatus(
  startDate: string,
  endDate: string,
): SubscriptionStatus | '일정미정' {
  if (!startDate || !endDate) return '일정미정';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (today < start) return '접수예정';
  if (today > end) return '마감';
  return '접수중';
}

// D-day 계산 (음수: D-N 접수 시작 전, 0: D-day, 양수: 마감)
export function getDday(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (today < start) {
    const diffMs = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'D-day';
    return `D-${diffDays}`;
  }

  if (today > end) {
    return '마감';
  }

  // 접수 중: 종료까지 남은 일수
  const diffMs = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'D-day';
  return `D-${diffDays}`;
}

// API SUBSCRPT_AREA_CODE_NM 필드는 단축명 사용 (서울, 경기, ...)
// 프론트에서 전체 이름(서울특별시)을 보내면 API 단축명으로 변환
export const REGION_MAP: Record<string, string> = {
  서울특별시: '서울',
  경기도: '경기',
  인천광역시: '인천',
  부산광역시: '부산',
  대구광역시: '대구',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
};

// 전체 이름 → API 단축명 변환 (이미 단축명이면 그대로 반환)
export function resolveRegionParam(region: string): string {
  return REGION_MAP[region] ?? region;
}

// 공공데이터 API 호출 (서버에서만 사용)
export async function fetchAnnouncementsFromAPI(region?: string): Promise<Announcement[]> {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const baseUrl =
      'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail';

    // serviceKey는 공공데이터포털 인코딩 키를 URL에 직접 삽입 (URLSearchParams 이중인코딩 방지)
    const queryParams = new URLSearchParams({
      page: '1',
      perPage: '20',
      returnType: 'JSON',
    });

    if (region) {
      const resolvedRegion = resolveRegionParam(region);
      queryParams.append('cond[SUBSCRPT_AREA_CODE_NM::EQ]', resolvedRegion);
    }

    const url = `${baseUrl}?serviceKey=${apiKey}&${queryParams.toString()}`;

    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      console.error('[API] Rate limit exceeded');
      return [];
    }

    if (!response.ok) {
      console.error(`[API] Error: ${response.status} ${response.statusText}`);
      return [];
    }

    const json = await response.json();
    const items: Record<string, string>[] = json?.data ?? [];

    return items.map((item, idx): Announcement => {
      const startDate = formatDate(item.RCEPT_BGNDE ?? '');
      const endDate = formatDate(item.RCEPT_ENDDE ?? '');
      const status = getSubscriptionStatus(startDate, endDate);

      return {
        id: item.HOUSE_MANAGE_NO ?? `api-${idx}`,
        pblancNo: item.PBLANC_NO ?? item.HOUSE_MANAGE_NO ?? `api-${idx}`,
        complexName: item.HOUSE_NM ?? '단지명 없음',
        builder: item.BSNS_MBY_NM ?? '건설사 없음',
        region: item.SUBSCRPT_AREA_CODE_NM ?? '',
        announcementDate: formatDate(item.RCRIT_PBLANC_DE ?? ''),
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        houseType: item.HOUSE_SECD_NM ?? '민영주택',
        pdfUrl: item.PBLANC_URL,
        totalHouseholds: item.TOT_SUPLY_HSHLDCO ? Number(item.TOT_SUPLY_HSHLDCO) : undefined,
        status: status === '일정미정' ? undefined : status,
        specialSupplyTypes: {
          newlyWed: Number(item.NWWDS_SUPLY_HSHLDCO ?? 0) > 0,
          firstHome: Number(item.LTTOT_TOP_SUPLY_HSHLDCO ?? 0) > 0,
          multiChild: Number(item.MNYCH_HSHLD_SUPLY_HSHLDCO ?? 0) > 0,
        },
      };
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[API] Timeout: serving mock data');
      return [];
    }
    console.error('[API] Unexpected error:', error);
    return [];
  }
}

// D-Day 배지 스타일 (마감 임박도에 따른 색상 분기)
export function getDdayBadgeStyle(dday: string): { label: string; className: string } {
  if (!dday || dday === '마감') return { label: '마감', className: 'bg-gray-100 text-gray-400' };
  if (dday === 'D-day') return { label: 'D-day', className: 'bg-red-500 text-white' };

  const days = parseInt(dday.replace('D-', ''), 10);
  if (days <= 3) return { label: dday, className: 'bg-red-100 text-red-600 font-bold' };
  if (days <= 7) return { label: dday, className: 'bg-orange-100 text-orange-600 font-bold' };
  return { label: dday, className: 'bg-blue-100 text-blue-600' };
}

// 등급 기반 추천 라벨
export function getScoreTierLabel(tier: 'S' | 'A' | 'B' | 'C'): { text: string; style: string } {
  if (tier === 'S' || tier === 'A') {
    return { text: '경쟁력 높음', style: 'bg-green-100 text-green-700' };
  }
  if (tier === 'B') {
    return { text: '평균 수준', style: 'bg-yellow-100 text-yellow-700' };
  }
  return { text: '경쟁 어려울 수 있음', style: 'bg-gray-100 text-gray-600' };
}

// 일반공급 자격 여부
export function getGeneralSupplyLabel(input: EligibilityInput): { eligible: boolean; text: string } {
  if (input.isHomeless && input.subscriptionPaymentCount >= 1) {
    return { eligible: true, text: '일반공급 자격 있음' };
  }
  return { eligible: false, text: '일반공급 자격 미충족' };
}

// 특별공급 매칭 라벨 (사용자 자격 × 공고 제공 유형 교집합)
export function getSpecialSupplyLabels(
  specialSupply: SpecialSupplyEligibility,
  announcementTypes?: { newlyWed: boolean; firstHome: boolean; multiChild: boolean },
): string[] {
  const labels: string[] = [];
  const newlyWed = announcementTypes ? announcementTypes.newlyWed && specialSupply.newlyWed : specialSupply.newlyWed;
  const firstHome = announcementTypes ? announcementTypes.firstHome && specialSupply.firstHome : specialSupply.firstHome;
  const multiChild = announcementTypes ? announcementTypes.multiChild && specialSupply.multiChild : specialSupply.multiChild;
  if (newlyWed) labels.push('신혼부부 특공 가능');
  if (firstHome) labels.push('생애최초 특공 가능');
  if (multiChild) labels.push('다자녀 특공 가능');
  return labels;
}

// Mock 데이터
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'mock-001',
    complexName: '서울 강남 래미안 센트럴',
    builder: '삼성물산',
    region: '서울특별시',
    announcementDate: '2026-03-10',
    subscriptionStartDate: '2026-03-22',
    subscriptionEndDate: '2026-03-24',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 350,
    specialSupplyTypes: { newlyWed: true, firstHome: true, multiChild: false },
  },
  {
    id: 'mock-002',
    complexName: '경기 판교 힐스테이트',
    builder: '현대엔지니어링',
    region: '경기도',
    announcementDate: '2026-03-12',
    subscriptionStartDate: '2026-03-21',
    subscriptionEndDate: '2026-03-25',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 520,
    specialSupplyTypes: { newlyWed: true, firstHome: false, multiChild: true },
  },
  {
    id: 'mock-003',
    complexName: '부산 해운대 더샵 마리나',
    builder: '포스코이앤씨',
    region: '부산광역시',
    announcementDate: '2026-03-14',
    subscriptionStartDate: '2026-03-21',
    subscriptionEndDate: '2026-03-23',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 280,
    specialSupplyTypes: { newlyWed: false, firstHome: true, multiChild: false },
  },
  {
    id: 'mock-004',
    complexName: '인천 송도 자이 더 스타',
    builder: 'GS건설',
    region: '인천광역시',
    announcementDate: '2026-03-15',
    subscriptionStartDate: '2026-03-26',
    subscriptionEndDate: '2026-03-28',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 410,
    specialSupplyTypes: { newlyWed: true, firstHome: true, multiChild: true },
  },
  {
    id: 'mock-005',
    complexName: '대구 수성 e편한세상',
    builder: 'DL이앤씨',
    region: '대구광역시',
    announcementDate: '2026-03-16',
    subscriptionStartDate: '2026-03-28',
    subscriptionEndDate: '2026-03-30',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 195,
    specialSupplyTypes: { newlyWed: false, firstHome: false, multiChild: false },
  },
  {
    id: 'mock-006',
    complexName: '경기 의정부 한양수자인',
    builder: '한양',
    region: '경기도',
    announcementDate: '2026-03-17',
    subscriptionStartDate: '2026-04-01',
    subscriptionEndDate: '2026-04-03',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 320,
    specialSupplyTypes: { newlyWed: true, firstHome: false, multiChild: false },
  },
  {
    id: 'mock-007',
    complexName: '세종 행복도시 국민임대',
    builder: 'LH한국토지주택공사',
    region: '세종특별자치시',
    announcementDate: '2026-03-18',
    subscriptionStartDate: '2026-04-07',
    subscriptionEndDate: '2026-04-09',
    houseType: '공공임대',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 150,
    specialSupplyTypes: { newlyWed: true, firstHome: true, multiChild: true },
  },
  {
    id: 'mock-008',
    complexName: '광주 첨단 아이파크',
    builder: 'HDC현대산업개발',
    region: '광주광역시',
    announcementDate: '2026-03-19',
    subscriptionStartDate: '2026-04-14',
    subscriptionEndDate: '2026-04-16',
    houseType: '민영주택',
    pdfUrl: 'https://www.applyhome.co.kr',
    totalHouseholds: 240,
    specialSupplyTypes: { newlyWed: false, firstHome: true, multiChild: false },
  },
];
