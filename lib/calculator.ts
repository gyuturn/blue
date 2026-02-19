import type { EligibilityInput, ScoreResult, SpecialSupplyEligibility } from '@/types';

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
 * 특별공급 자격 판정
 * - 신혼부부: 혼인 상태이고 혼인 기간 7년 이내 (isMarried 활용)
 * - 생애최초: 무주택자이고 청약통장 가입
 * - 다자녀: 부양가족(미성년 자녀) 3명 이상
 */
export function calculateSpecialSupply(
  input: EligibilityInput,
): SpecialSupplyEligibility {
  // 신혼부부: 혼인 상태
  const newlyWed = input.isMarried;

  // 생애최초: 무주택 + 청약통장 납입 횟수 12회 이상
  const firstHome =
    input.isHomeless && input.subscriptionPaymentCount >= 12;

  // 다자녀: 부양가족 3명 이상 (자녀 기준 - 간략화된 판정)
  // 배우자 포함 부양가족 수에서 배우자 1명을 빼면 자녀 수로 간주
  const childCount = input.isMarried
    ? Math.max(0, input.dependentsCount - 1)
    : input.dependentsCount;
  const multiChild = childCount >= 3;

  return { newlyWed, firstHome, multiChild };
}
