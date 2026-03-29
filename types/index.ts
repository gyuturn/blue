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
  specialSupplyTypes?: {
    newlyWed: boolean;   // 신혼부부 특별공급 있음
    firstHome: boolean;  // 생애최초 특별공급 있음
    multiChild: boolean; // 다자녀 특별공급 있음
  };
}
