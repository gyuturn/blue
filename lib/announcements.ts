import type {
  Announcement,
  EligibilityInput,
  SpecialSupplyCounts,
  SpecialSupplyEligibility,
  StoredScoreData,
  SubscriptionStatus,
} from '@/types';

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

    const announcements = items.map((item, idx): Announcement => {
      const startDate = formatDate(item.RCEPT_BGNDE ?? '');
      const endDate = formatDate(item.RCEPT_ENDDE ?? '');
      const status = getSubscriptionStatus(startDate, endDate);

      return {
        // API가 숫자로 내려줄 수 있으므로 문자열로 고정
        id: String(item.HOUSE_MANAGE_NO ?? `api-${idx}`),
        pblancNo: String(item.PBLANC_NO ?? item.HOUSE_MANAGE_NO ?? `api-${idx}`),
        complexName: item.HOUSE_NM ?? '단지명 없음',
        builder: item.BSNS_MBY_NM ?? '건설사 없음',
        region: item.SUBSCRPT_AREA_CODE_NM ?? '',
        address: item.HSSPLY_ADRES?.trim() || undefined,
        announcementDate: formatDate(item.RCRIT_PBLANC_DE ?? ''),
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        houseType: item.HOUSE_SECD_NM ?? '민영주택',
        pdfUrl: item.PBLANC_URL,
        totalHouseholds: item.TOT_SUPLY_HSHLDCO ? Number(item.TOT_SUPLY_HSHLDCO) : undefined,
        status: status === '일정미정' ? undefined : status,
        supplyKind: item.HOUSE_DTL_SECD_NM === '국민' ? '국민' : item.HOUSE_DTL_SECD_NM === '민영' ? '민영' : undefined,
        regulation: parseRegulation(item),
      };
    });

    return await withSpecialSupplyCounts(apiKey, announcements);
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

// Y/N 이외의 값(필드 누락 포함)은 '모름'으로 처리 — 잘못된 '비규제지역' 안내를 막기 위함
function parseYn(value: string | undefined): boolean | undefined {
  if (value === 'Y') return true;
  if (value === 'N') return false;
  return undefined;
}

function parseRegulation(item: Record<string, string>): Announcement['regulation'] {
  const speculationOverheated = parseYn(item.SPECLT_RDN_EARTH_AT);
  const adjustedArea = parseYn(item.MDAT_TRGET_AREA_SECD);
  if (speculationOverheated === undefined || adjustedArea === undefined) return undefined;
  return { speculationOverheated, adjustedArea, priceCap: parseYn(item.PARCPRC_ULS_AT) ?? false };
}

// 특별공급 유형별 세대수는 주택형별 API에만 있으므로 공고별로 병렬 조회해 합산
// 부가 정보이므로 어떤 이유로 실패해도 공고 목록은 그대로 반환한다
async function withSpecialSupplyCounts(apiKey: string, announcements: Announcement[]): Promise<Announcement[]> {
  try {
    const counts = await Promise.all(
      announcements.map((a) =>
        // 마감 공고는 기본 숨김이라 API 호출량 절약을 위해 생략
        a.status === '마감' || a.id.startsWith('api-') ? null : fetchSpecialSupplyCounts(apiKey, a.id),
      ),
    );
    return announcements.map((a, i) => {
      const c = counts[i];
      return c ? { ...a, specialSupplyCounts: c } : a;
    });
  } catch (error) {
    console.error('[API] special supply enrichment failed:', error);
    return announcements;
  }
}

// 주택형별 공급 API에서 특별공급 유형별 세대수 합산 (실패 시 null → 화면에서 숨김)
async function fetchSpecialSupplyCounts(apiKey: string, houseManageNo: string): Promise<SpecialSupplyCounts | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const baseUrl = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl';
    const queryParams = new URLSearchParams({ page: '1', perPage: '100', returnType: 'JSON' });
    queryParams.append('cond[HOUSE_MANAGE_NO::EQ]', houseManageNo);

    const response = await fetch(`${baseUrl}?serviceKey=${apiKey}&${queryParams.toString()}`, {
      signal: controller.signal,
      // 특공 세대수는 공고 후 바뀌지 않으므로 길게 캐시 (API 호출량 절약)
      next: { revalidate: 21600 },
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`[API] special supply error: ${response.status} (${houseManageNo})`);
      return null;
    }

    const json = await response.json();
    const items: Record<string, string>[] = json?.data ?? [];
    if (items.length === 0) return null;

    const sum = (key: string) => items.reduce((acc, it) => acc + (Number(it[key]) || 0), 0);
    return {
      newlyWed: sum('NWWDS_HSHLDCO'),
      firstHome: sum('LFE_FRST_HSHLDCO'),
      multiChild: sum('MNYCH_HSHLDCO'),
      newborn: sum('NWBB_HSHLDCO'),
      youth: sum('YGMN_HSHLDCO'),
      oldParents: sum('OLD_PARNTS_SUPORT_HSHLDCO'),
      institution: sum('INSTT_RECOMEND_HSHLDCO'),
      other: sum('TRANSR_INSTT_ENFSN_HSHLDCO') + sum('ETC_HSHLDCO'),
      generalTotal: sum('SUPLY_HSHLDCO'),
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
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

// 일반공급 자격 여부
export function getGeneralSupplyLabel(input: EligibilityInput): { eligible: boolean; text: string } {
  if (input.isHomeless && input.subscriptionPaymentCount >= 1) {
    return { eligible: true, text: '일반공급 자격 있음' };
  }
  return { eligible: false, text: '일반공급 자격 미충족' };
}

// 공고가 제공하는 특별공급 유형 목록 (세대수 + 내 자격 매칭 여부)
export interface SpecialSupplyBadge {
  key: keyof Omit<SpecialSupplyCounts, 'generalTotal'>;
  name: string;
  count: number;
  matched: boolean; // 내 입력 정보로 자격이 있는 유형
}

const SPECIAL_SUPPLY_NAMES: Record<SpecialSupplyBadge['key'], string> = {
  newlyWed: '신혼부부',
  firstHome: '생애최초',
  multiChild: '다자녀',
  newborn: '신생아',
  youth: '청년',
  oldParents: '노부모부양',
  institution: '기관추천',
  other: '기타',
};

export function getSpecialSupplyBadges(
  announcement: Announcement,
  specialSupply?: SpecialSupplyEligibility,
): SpecialSupplyBadge[] {
  const counts = announcement.specialSupplyCounts;
  if (!counts) return [];
  return (Object.keys(SPECIAL_SUPPLY_NAMES) as SpecialSupplyBadge['key'][])
    .filter((key) => counts[key] > 0)
    .map((key) => ({
      key,
      name: SPECIAL_SUPPLY_NAMES[key],
      count: counts[key],
      matched:
        !!specialSupply &&
        (key === 'newlyWed' || key === 'firstHome' || key === 'multiChild') &&
        specialSupply[key],
    }));
}

// 경쟁 분석: 라벨 + "왜 그런지" 이유 목록
export type CompetitionLevel = 'good' | 'fair' | 'hard' | 'notApplicable';

export interface CompetitionReason {
  tone: 'plus' | 'minus' | 'info';
  text: string;
}

export interface CompetitionAnalysis {
  level: CompetitionLevel;
  label: string;
  style: string;
  reasons: CompetitionReason[];
}

const LEVEL_META: Record<CompetitionLevel, { label: string; style: string }> = {
  good: { label: '경쟁력 높음', style: 'bg-green-100 text-green-700' },
  fair: { label: '도전해볼 만함', style: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '경쟁 어려울 수 있음', style: 'bg-gray-100 text-gray-600' },
  notApplicable: { label: '신청 대상 아님', style: 'bg-red-50 text-red-500' },
};

const TIER_DIFFICULTY: Record<StoredScoreData['result']['tier'], number> = { S: 0, A: 1, B: 2, C: 3 };

function levelFromDifficulty(d: number): CompetitionLevel {
  if (d <= 1) return 'good';
  if (d === 2) return 'fair';
  return 'hard';
}

function buildAnalysis(level: CompetitionLevel, reasons: CompetitionReason[], label?: string): CompetitionAnalysis {
  return { level, label: label ?? LEVEL_META[level].label, style: LEVEL_META[level].style, reasons };
}

function isNewlyWedTown(a: Announcement): boolean {
  return a.houseType.includes('신혼희망');
}

export function getCompetitionAnalysis(
  announcement: Announcement,
  scoreData: StoredScoreData,
): CompetitionAnalysis {
  const { input, result, specialSupply } = scoreData;
  const reasons: CompetitionReason[] = [];

  // 내가 신청할 수 있는 특별공급 (가점과 별개로 뽑으므로 플러스 요인)
  const matchedSpecial = getSpecialSupplyBadges(announcement, specialSupply).filter((b) => b.matched);
  const specialReasons: CompetitionReason[] = matchedSpecial.map((b) => ({
    tone: 'plus',
    text: `${b.name} 특별공급 ${b.count.toLocaleString()}세대 — 내 조건에 해당해요 (소득·자산 기준 충족 시 신청 가능, 가점과 별개로 뽑아요)`,
  }));

  // 1) 신혼희망타운: 신혼부부·예비신혼·한부모만, 청약 가점 미사용
  if (isNewlyWedTown(announcement)) {
    reasons.push({ tone: 'info', text: '신혼희망타운은 신혼부부·예비신혼부부·한부모 가정만 신청할 수 있어요' });
    reasons.push({ tone: 'info', text: '청약 가점(84점)이 아니라 소득·거주기간·납입횟수 등 별도 배점으로 뽑아요' });
    if (!specialSupply.newlyWed) {
      reasons.push({
        tone: 'minus',
        text: input.isHomeless
          ? '입력한 정보로는 신혼부부 요건(혼인 7년 이내)에 해당하지 않아요'
          : '신혼희망타운은 무주택 세대만 신청할 수 있어요',
      });
      return buildAnalysis('notApplicable', reasons, '신혼부부 전용 공고');
    }
    reasons.push({ tone: 'plus', text: '신혼부부 요건에 해당해요 — 가점이 낮아도 도전할 수 있어요' });
    return buildAnalysis('fair', reasons);
  }

  // 일반공급 자격 (무주택 + 청약통장)
  const generalEligible = getGeneralSupplyLabel(input).eligible;
  if (!generalEligible) {
    reasons.push({ tone: 'minus', text: '무주택·청약통장 요건을 채우지 못해 일반공급 신청이 어려워요' });
    if (matchedSpecial.length === 0) return buildAnalysis('notApplicable', reasons);
  }

  // 2) 국민주택(공공분양): 가점이 아니라 납입 횟수·저축 총액 순차제
  if (announcement.supplyKind === '국민') {
    reasons.push({ tone: 'info', text: '공공분양 일반공급은 가점이 아니라 청약통장 납입 횟수·저축 총액 순으로 뽑아요' });
    const count = input.subscriptionPaymentCount;
    if (!generalEligible) return buildAnalysis('fair', [...reasons, ...specialReasons]);
    let d: number;
    if (count >= 120) {
      d = 1;
      reasons.push({ tone: 'plus', text: `내 납입 횟수 ${count}회 — 순차제에서 유리한 편이에요` });
    } else if (count >= 60) {
      d = 2;
      reasons.push({ tone: 'info', text: `내 납입 횟수 ${count}회 — 인기 단지는 이보다 많은 경우가 많아요` });
    } else {
      d = 3;
      reasons.push({ tone: 'minus', text: `내 납입 횟수 ${count}회 — 납입 횟수가 적으면 순차제에서 불리해요` });
    }
    if (matchedSpecial.length > 0 && d === 3) d = 2;
    return buildAnalysis(levelFromDifficulty(d), [...reasons, ...specialReasons]);
  }

  // 3) 민영주택: 가점제 + 지역 규제·분양가상한제 반영
  let d = TIER_DIFFICULTY[result.tier];
  const tierText =
    result.tier === 'S' || result.tier === 'A'
      ? '가점제에서 유리해요'
      : result.tier === 'B'
      ? '가점제에서 평균 수준이에요'
      : '가점제에서는 불리해요';
  reasons.push({
    tone: result.tier === 'C' ? 'minus' : result.tier === 'B' ? 'info' : 'plus',
    text: `내 가점 ${result.totalScore}점(${result.tier}등급) — ${tierText}`,
  });

  const reg = announcement.regulation;
  if (reg) {
    if (reg.speculationOverheated || reg.adjustedArea) {
      d += 1;
      const name = reg.speculationOverheated ? '투기과열지구' : '조정대상지역';
      reasons.push({ tone: 'minus', text: `${name} — 가점제 비중이 높아 가점이 중요해요` });
    } else if (result.tier === 'B' || result.tier === 'C') {
      d -= 1;
      reasons.push({ tone: 'plus', text: '비규제지역 — 추첨제 물량이 있어 가점이 낮아도 당첨 기회가 있어요' });
    }
    if (reg.priceCap) {
      d += 1;
      reasons.push({ tone: 'minus', text: '분양가상한제 적용 — 시세보다 저렴해 신청자가 몰리는 편이에요' });
    }
  }

  if (!generalEligible) return buildAnalysis('fair', [...reasons, ...specialReasons]);
  if (matchedSpecial.length > 0 && d >= 3) d = 2;

  return buildAnalysis(levelFromDifficulty(d), [...reasons, ...specialReasons]);
}

// Mock 특공 세대수: 지정한 유형 + 노부모부양·기관추천 일부, 나머지는 일반공급
function mockCounts(
  total: number,
  partial: Pick<SpecialSupplyCounts, 'newlyWed' | 'firstHome' | 'multiChild'>,
): SpecialSupplyCounts {
  const oldParents = Math.round(total * 0.03);
  const institution = Math.round(total * 0.1);
  const special = partial.newlyWed + partial.firstHome + partial.multiChild + oldParents + institution;
  return {
    ...partial,
    newborn: 0,
    youth: 0,
    oldParents,
    institution,
    other: 0,
    generalTotal: total - special,
  };
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
    specialSupplyCounts: mockCounts(350, { newlyWed: 63, firstHome: 35, multiChild: 0 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: true, adjustedArea: true, priceCap: true },
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
    specialSupplyCounts: mockCounts(520, { newlyWed: 94, firstHome: 0, multiChild: 42 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
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
    specialSupplyCounts: mockCounts(280, { newlyWed: 0, firstHome: 28, multiChild: 0 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
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
    specialSupplyCounts: mockCounts(410, { newlyWed: 74, firstHome: 41, multiChild: 33 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
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
    specialSupplyCounts: mockCounts(195, { newlyWed: 0, firstHome: 0, multiChild: 0 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
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
    specialSupplyCounts: mockCounts(320, { newlyWed: 58, firstHome: 0, multiChild: 0 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
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
    specialSupplyCounts: mockCounts(150, { newlyWed: 27, firstHome: 15, multiChild: 12 }),
    supplyKind: '국민',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
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
    specialSupplyCounts: mockCounts(240, { newlyWed: 0, firstHome: 24, multiChild: 0 }),
    supplyKind: '민영',
    regulation: { speculationOverheated: false, adjustedArea: false, priceCap: false },
  },
];
