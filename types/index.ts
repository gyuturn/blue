// 청약 입력 데이터 타입
export interface EligibilityInput {
  // 무주택 정보
  isHomeless: boolean;
  birthDate: string; // 생년월일 YYYY-MM 형식
  homelessYears: number; // 무주택 기간 (년, 정책 기준 자동 계산값)

  // 부양가족
  dependentsCount: number; // 부양가족 수 (배우자 포함)

  // 청약통장
  subscriptionStartDate: string; // YYYY-MM 형식
  subscriptionPaymentCount: number; // 납입 횟수
  subscriptionBalance: number; // 예치 금액 (만원)

  // 거주지역
  region: string; // 광역시/도

  // 혼인/자녀
  isMarried: boolean;
  marriageDate: string;    // YYYY-MM, 기혼일 때만 유효
  childrenCount: number;   // 미성년(만 19세 미만) 자녀 수
  hasRecentChild: boolean; // 최근 2년 내 자녀 출산
}

// 가점 결과 타입
export interface ScoreResult {
  homelessScore: number; // 무주택 점수 (0~32)
  dependentsScore: number; // 부양가족 점수 (0~35)
  subscriptionScore: number; // 청약통장 점수 (0~17)
  totalScore: number; // 총점 (0~84)
  tier: 'S' | 'A' | 'B' | 'C';
  positioning: string;
}

// 특별공급 자격 타입
export interface SpecialSupplyEligibility {
  newlyWed: boolean; // 신혼부부
  firstHome: boolean; // 생애최초
  multiChild: boolean; // 다자녀
}

// sessionStorage 저장 스키마
export interface StoredScoreData {
  input: EligibilityInput;
  result: ScoreResult;
  specialSupply: SpecialSupplyEligibility;
  savedAt: number;
}

// 청약 접수 상태 타입
export type SubscriptionStatus = '접수중' | '접수예정' | '마감';

// 청약 공고 타입
export interface Announcement {
  id: string;
  pblancNo?: string; // 공고번호 (청약홈 상세 URL용)
  complexName: string; // 단지명
  builder: string; // 건설사
  region: string; // 지역
  announcementDate: string; // 모집공고일
  subscriptionStartDate: string; // 청약 접수 시작일
  subscriptionEndDate: string; // 청약 접수 종료일
  houseType: string; // 주택 유형
  pdfUrl?: string; // 원문 공고문 URL
  totalHouseholds?: number; // 공급 세대수
  status?: SubscriptionStatus; // 접수 상태
  specialSupplyCounts?: SpecialSupplyCounts; // 특별공급 유형별 세대수 (주택형별 API 합산)
  supplyKind?: '민영' | '국민'; // 민영주택(가점제) / 국민주택(공공분양, 납입횟수 순차제)
  regulation?: {
    speculationOverheated: boolean; // 투기과열지구
    adjustedArea: boolean;          // 조정대상지역
    priceCap: boolean;              // 분양가상한제
  };
}

// 특별공급 유형별 세대수
export interface SpecialSupplyCounts {
  newlyWed: number;    // 신혼부부
  firstHome: number;   // 생애최초
  multiChild: number;  // 다자녀
  newborn: number;     // 신생아
  youth: number;       // 청년
  oldParents: number;  // 노부모부양
  institution: number; // 기관추천
  other: number;       // 이전기관·기타
  generalTotal: number; // 일반공급 합계
}

// 청약홈 스크래핑 상세 데이터
export interface AnnouncementDetail {
  location?: string;        // 공급 위치
  totalSupply?: string;     // 공급 규모
  operator?: string;        // 시행사
  constructor?: string;     // 시공사
  moveInDate?: string;      // 입주 예정월
  announcementDate?: string; // 모집공고일
  winnerDate?: string;       // 당첨자 발표일
  contractPeriod?: string;   // 계약일
  schedule: {
    type: string;   // 특별공급 / 1순위 / 2순위
    localDate?: string;
    otherDate?: string;
    place?: string;
  }[];
  units: {
    type: string;         // 주택형 (예: 084.40A)
    supplyArea?: string;  // 공급면적
    totalCount?: string;  // 공급 세대수
    price?: string;       // 분양가
  }[];
}
