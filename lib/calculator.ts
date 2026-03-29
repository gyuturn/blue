import type { EligibilityInput, ScoreResult, SpecialSupplyEligibility } from '@/types';

/**
 * 무주택기간 산정 시작일 계산 (주택공급에관한규칙)
 * - 만 30세 미만 미혼: null (산정 불가)
 * - 만 30세 이상 미혼: 만 30세 생일
 * - 기혼 + 만 30세 미만: 혼인신고일
 * - 기혼 + 만 30세 이상: 만 30세 생일 vs 혼인신고일 중 빠른 날
 */
export function calcHomelessStartDate(
  birthDate: string,
  isMarried: boolean,
  marriageDate: string,
): Date | null {
  if (!birthDate) return null;

  const [birthYear, birthMonth] = birthDate.split('-').map(Number);
  if (!birthYear || !birthMonth) return null;

  const thirtiethBirthday = new Date(birthYear + 30, birthMonth - 1, 1);
  const now = new Date();

  if (!isMarried) {
    // 미혼: 만 30세 미만이면 산정 불가
    if (now < thirtiethBirthday) return null;
    return thirtiethBirthday;
  }

  // 기혼: 혼인신고일 파싱
  const marriageStart = (() => {
    if (!marriageDate) return null;
    const [y, m] = marriageDate.split('-').map(Number);
    if (!y || !m) return null;
    return new Date(y, m - 1, 1);
  })();

  if (!marriageStart) return null;

  // 만 30세 이전에 결혼: 혼인신고일부터
  if (marriageStart < thirtiethBirthday) return marriageStart;

  // 만 30세 이후에 결혼: 만 30세 생일부터 (더 빠름)
  return thirtiethBirthday;
}

/**
 * 정책 기준으로 무주택기간(년) 계산
 */
export function calcHomelessYearsFromPolicy(
  birthDate: string,
  isMarried: boolean,
  marriageDate: string,
): number {
  const startDate = calcHomelessStartDate(birthDate, isMarried, marriageDate);
  if (!startDate) return 0;

  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * 무주택 기간 점수 계산
 * 1년 미만: 2점, 1년~1년 미만: 2점, 최대 32점 (16년 이상)
 * 기준: 1년 = 2점, 2점씩 증가, 최대 16년 이상 = 32점
 */
export function calculateHomelessScore(years: number): number {
  if (years <= 0) return 2; // 1년 미만도 최소 2점
  const score = Math.min(Math.floor(years) * 2, 32);
  return Math.max(score, 2);
}

/**
 * 부양가족 점수 계산
 * 0명=5점, 1명=10점, 2명=15점, 3명=20점, 4명=25점, 5명=30점, 6명 이상=35점
 */
export function calculateDependentsScore(count: number): number {
  const scoreMap: Record<number, number> = {
    0: 5,
    1: 10,
    2: 15,
    3: 20,
    4: 25,
    5: 30,
  };
  if (count >= 6) return 35;
  return scoreMap[count] ?? 5;
}

/**
 * 청약통장 가입기간 점수 계산
 * 1년 = 2점, 최대 17점 (8년 이상 = 17점)
 */
export function calculateSubscriptionScore(startDate: string): number {
  if (!startDate) return 1;
  const [year, month] = startDate.split('-').map(Number);
  if (!year || !month) return 1;

  const now = new Date();
  const start = new Date(year, month - 1, 1);
  const diffMs = now.getTime() - start.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  if (diffYears < 1) return 1;
  const score = Math.min(Math.floor(diffYears) * 2 + 1, 17);
  return score;
}

/**
 * 총점 계산 및 등급/포지셔닝 결정
 * 총점 = 무주택(0~32) + 부양가족(0~35) + 청약통장(0~17) = 0~84점
 */
export function calculateTotalScore(input: EligibilityInput): ScoreResult {
  const homelessScore = input.isHomeless
    ? calculateHomelessScore(input.homelessYears)
    : 0;
  const dependentsScore = calculateDependentsScore(input.dependentsCount);
  const subscriptionScore = calculateSubscriptionScore(input.subscriptionStartDate);
  const totalScore = homelessScore + dependentsScore + subscriptionScore;

  let tier: ScoreResult['tier'];
  let positioning: string;

  if (totalScore >= 70) {
    tier = 'S';
    positioning =
      '청약 경쟁력이 매우 높습니다. 인기 단지 일반공급 도전이 가능합니다.';
  } else if (totalScore >= 55) {
    tier = 'A';
    positioning =
      '청약 경쟁력이 높습니다. 수도권 외곽 및 지방 인기 단지 도전을 권장합니다.';
  } else if (totalScore >= 40) {
    tier = 'B';
    positioning =
      '평균적인 청약 경쟁력입니다. 비인기 지역 또는 특별공급을 함께 검토하세요.';
  } else {
    tier = 'C';
    positioning =
      '현재 가점이 낮습니다. 특별공급 자격 여부를 확인하거나 가점을 적립하는 것을 권장합니다.';
  }

  return {
    homelessScore,
    dependentsScore,
    subscriptionScore,
    totalScore,
    tier,
    positioning,
  };
}

/**
 * 혼인 기간 계산 (년 단위)
 */
export function calcMarriageYears(marriageDate: string): number {
  if (!marriageDate) return Infinity;
  const [year, month] = marriageDate.split('-').map(Number);
  if (!year || !month) return Infinity;
  const start = new Date(year, month - 1, 1);
  return (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * 특별공급 자격 판정
 * - 신혼부부: 기혼 + 혼인 7년 이내
 * - 생애최초: 무주택 + 청약통장 납입 12회 이상
 * - 다자녀: 미성년(만 19세 미만) 자녀 3명 이상
 */
export function calculateSpecialSupply(
  input: EligibilityInput,
): SpecialSupplyEligibility {
  // 신혼부부: 기혼 + 혼인 7년 이내
  const newlyWed = input.isMarried && calcMarriageYears(input.marriageDate) <= 7;

  // 생애최초: 무주택 + 청약통장 납입 횟수 12회 이상
  const firstHome =
    input.isHomeless && input.subscriptionPaymentCount >= 12;

  // 다자녀: 미성년(만 19세 미만) 자녀 3명 이상
  const multiChild = (input.childrenCount ?? 0) >= 3;

  return { newlyWed, firstHome, multiChild };
}
