# 기술 스택 및 핵심 로직 설계

## 기술 스택 상세

### 프론트엔드 / 풀스택 프레임워크

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 14.x (App Router) | 풀스택 프레임워크, SSR/ISR/RSC |
| **React** | 18.x | UI 컴포넌트 라이브러리 |
| **TypeScript** | 5.x | 정적 타입 시스템, 안전한 코드 작성 |
| **Tailwind CSS** | 3.x | 유틸리티 기반 CSS 프레임워크 |

### 상태 관리 및 폼

| 기술 | 용도 |
|------|------|
| **React Hook Form** | 청약 자격 판정 / 가점 계산 폼 상태 관리, 유효성 검증 |
| **Zod** | TypeScript 스키마 기반 런타임 유효성 검증 |
| **React Context API** | 전역 상태 (스텝 진행 상태, 계산 결과) 관리 |

### 배포 및 인프라

| 기술 | 용도 |
|------|------|
| **Vercel** | 배포, CDN, Edge Network, ISR |
| **GitHub Actions** | CI/CD 파이프라인 (타입 체크, 린트) |

### 개발 도구

| 기술 | 용도 |
|------|------|
| **ESLint** | 코드 품질 관리 |
| **Prettier** | 코드 포매팅 |

---

## 청약 가점 계산 로직 설계

### 가점 항목 개요

청약 가점제는 총 84점 만점으로, 세 가지 항목으로 구성됩니다.

| 항목 | 최고 점수 | 계산 기준 |
|------|----------|----------|
| 무주택 기간 | 32점 | 세대원 전원 무주택 기간 (1점~32점) |
| 부양가족 수 | 35점 | 주민등록등본 기준 부양가족 (5점~35점) |
| 청약통장 가입 기간 | 17점 | 청약저축/종합저축 가입 기간 (1점~17점) |
| **합계** | **84점** | |

---

### 1. 무주택 기간 점수 (0~32점)

무주택 기간은 만 30세 이후 또는 혼인신고일 이후부터 계산합니다.

```typescript
// lib/score/calculator.ts

/**
 * 무주택 기간 점수 계산 (최대 32점)
 * - 무주택 기간이 없으면 0점 (유주택자)
 * - 만 30세 미만 미혼자는 0점
 */
export function calculateHomelessnessScore(
  homelessYears: number,
  isHomeless: boolean
): number {
  if (!isHomeless) return 0;
  if (homelessYears < 1) return 2;

  const scoreTable: Array<{ maxYears: number; score: number }> = [
    { maxYears: 1, score: 2 },
    { maxYears: 2, score: 4 },
    { maxYears: 3, score: 6 },
    { maxYears: 4, score: 8 },
    { maxYears: 5, score: 10 },
    { maxYears: 6, score: 12 },
    { maxYears: 7, score: 14 },
    { maxYears: 8, score: 16 },
    { maxYears: 9, score: 18 },
    { maxYears: 10, score: 20 },
    { maxYears: 11, score: 22 },
    { maxYears: 12, score: 24 },
    { maxYears: 13, score: 26 },
    { maxYears: 14, score: 28 },
    { maxYears: 15, score: 30 },
    { maxYears: Infinity, score: 32 }, // 15년 이상: 32점
  ];

  for (const { maxYears, score } of scoreTable) {
    if (homelessYears < maxYears) return score;
    if (maxYears === Infinity) return score;
  }

  return 32;
}
```

#### 무주택 기간 점수 상세표

| 무주택 기간 | 점수 |
|-----------|------|
| 1년 미만 | 2점 |
| 1년 이상 ~ 2년 미만 | 4점 |
| 2년 이상 ~ 3년 미만 | 6점 |
| 3년 이상 ~ 4년 미만 | 8점 |
| 4년 이상 ~ 5년 미만 | 10점 |
| 5년 이상 ~ 6년 미만 | 12점 |
| 6년 이상 ~ 7년 미만 | 14점 |
| 7년 이상 ~ 8년 미만 | 16점 |
| 8년 이상 ~ 9년 미만 | 18점 |
| 9년 이상 ~ 10년 미만 | 20점 |
| 10년 이상 ~ 11년 미만 | 22점 |
| 11년 이상 ~ 12년 미만 | 24점 |
| 12년 이상 ~ 13년 미만 | 26점 |
| 13년 이상 ~ 14년 미만 | 28점 |
| 14년 이상 ~ 15년 미만 | 30점 |
| 15년 이상 | 32점 |

---

### 2. 부양가족 수 점수 (0~35점)

청약 신청자 본인을 제외한 세대원 수로 계산합니다. (배우자, 직계존속, 직계비속)

```typescript
/**
 * 부양가족 수 점수 계산 (최대 35점)
 * 부양가족 0명: 5점 (신청자 본인만 계산 시)
 * 부양가족 6명 이상: 35점
 */
export function calculateDependentsScore(dependentsCount: number): number {
  const scoreTable: Record<number, number> = {
    0: 5,
    1: 10,
    2: 15,
    3: 20,
    4: 25,
    5: 30,
  };

  if (dependentsCount >= 6) return 35;
  return scoreTable[dependentsCount] ?? 5;
}
```

#### 부양가족 수 점수 상세표

| 부양가족 수 | 점수 |
|-----------|------|
| 0명 | 5점 |
| 1명 | 10점 |
| 2명 | 15점 |
| 3명 | 20점 |
| 4명 | 25점 |
| 5명 | 30점 |
| 6명 이상 | 35점 |

**부양가족 인정 기준**:
- 배우자 (세대 분리 여부 무관)
- 직계존속 (부모, 조부모): 3년 이상 동일 주민등록 등재 + 무주택자
- 직계비속 (자녀): 만 30세 미만 미혼 또는 미성년

---

### 3. 청약통장 가입 기간 점수 (0~17점)

청약저축 또는 주택청약종합저축 최초 가입일 기준으로 계산합니다.

```typescript
/**
 * 청약통장 가입 기간 점수 계산 (최대 17점)
 */
export function calculateSubscriptionPeriodScore(
  subscriptionYears: number
): number {
  const scoreTable: Array<{ maxYears: number; score: number }> = [
    { maxYears: 1, score: 1 },
    { maxYears: 2, score: 2 },
    { maxYears: 3, score: 3 },
    { maxYears: 4, score: 4 },
    { maxYears: 5, score: 5 },
    { maxYears: 6, score: 6 },
    { maxYears: 7, score: 7 },
    { maxYears: 8, score: 8 },
    { maxYears: 9, score: 9 },
    { maxYears: 10, score: 10 },
    { maxYears: 11, score: 11 },
    { maxYears: 12, score: 12 },
    { maxYears: 13, score: 13 },
    { maxYears: 14, score: 14 },
    { maxYears: 15, score: 15 },
    { maxYears: Infinity, score: 17 }, // 15년 이상: 17점
  ];

  for (const { maxYears, score } of scoreTable) {
    if (subscriptionYears < maxYears) return score;
    if (maxYears === Infinity) return score;
  }

  return 17;
}
```

#### 청약통장 가입 기간 점수 상세표

| 가입 기간 | 점수 |
|----------|------|
| 6개월 미만 | 1점 |
| 6개월 이상 ~ 1년 미만 | 2점 |
| 1년 이상 ~ 2년 미만 | 3점 |
| 2년 이상 ~ 3년 미만 | 4점 |
| 3년 이상 ~ 4년 미만 | 5점 |
| 4년 이상 ~ 5년 미만 | 6점 |
| 5년 이상 ~ 6년 미만 | 7점 |
| 6년 이상 ~ 7년 미만 | 8점 |
| 7년 이상 ~ 8년 미만 | 9점 |
| 8년 이상 ~ 9년 미만 | 10점 |
| 9년 이상 ~ 10년 미만 | 11점 |
| 10년 이상 ~ 11년 미만 | 12점 |
| 11년 이상 ~ 12년 미만 | 13점 |
| 12년 이상 ~ 13년 미만 | 14점 |
| 13년 이상 ~ 14년 미만 | 15점 |
| 14년 이상 ~ 15년 미만 | 16점 |
| 15년 이상 | 17점 |

---

### 총점 계산 함수

```typescript
/**
 * 청약 가점 총점 계산 (최대 84점)
 */
export function calculateTotalScore(input: ScoreInput): ScoreResult {
  const homelessnessScore = calculateHomelessnessScore(
    input.homelessYears,
    input.isHomeless
  );
  const dependentsScore = calculateDependentsScore(input.dependentsCount);
  const subscriptionScore = calculateSubscriptionPeriodScore(
    input.subscriptionYears
  );

  const totalScore = homelessnessScore + dependentsScore + subscriptionScore;

  return {
    totalScore,
    breakdown: {
      homelessness: {
        score: homelessnessScore,
        maxScore: 32,
        years: input.homelessYears,
      },
      dependents: {
        score: dependentsScore,
        maxScore: 35,
        count: input.dependentsCount,
      },
      subscription: {
        score: subscriptionScore,
        maxScore: 17,
        years: input.subscriptionYears,
      },
    },
  };
}
```

---

## 특별공급 자격 판정 로직

### 특별공급 유형별 자격 기준

```typescript
// lib/eligibility/calculator.ts

/**
 * 신혼부부 특별공급 자격 판정
 */
export function checkNewlywedEligibility(input: EligibilityInput): EligibilityResult {
  const conditions: EligibilityCondition[] = [
    {
      id: 'married',
      description: '혼인 상태',
      met: input.isMarried,
      required: true,
    },
    {
      id: 'marriage_period',
      description: '혼인기간 7년 이내',
      met: input.marriageYears !== undefined && input.marriageYears <= 7,
      required: true,
    },
    {
      id: 'homeless',
      description: '무주택 세대구성원',
      met: input.isHomeless,
      required: true,
    },
    {
      id: 'income',
      description: '도시근로자 월평균 소득 140% 이하 (맞벌이 160% 이하)',
      met: input.incomeRatio !== undefined && input.incomeRatio <= (input.isBothWorking ? 1.6 : 1.4),
      required: true,
    },
  ];

  const allMet = conditions.filter(c => c.required).every(c => c.met);

  return {
    type: 'special_newlywed',
    eligible: allMet,
    conditions,
    note: allMet
      ? '신혼부부 특별공급 신청 자격이 있습니다.'
      : '일부 조건을 충족하지 못했습니다. 상세 조건을 확인하세요.',
  };
}

/**
 * 생애최초 특별공급 자격 판정
 */
export function checkFirstHomeEligibility(input: EligibilityInput): EligibilityResult {
  const conditions: EligibilityCondition[] = [
    {
      id: 'first_home',
      description: '생애 최초 주택 구입 (세대원 전원 주택 미소유 이력)',
      met: input.isFirstHome,
      required: true,
    },
    {
      id: 'homeless',
      description: '무주택 세대구성원',
      met: input.isHomeless,
      required: true,
    },
    {
      id: 'income',
      description: '도시근로자 월평균 소득 130% 이하',
      met: input.incomeRatio !== undefined && input.incomeRatio <= 1.3,
      required: true,
    },
    {
      id: 'subscription',
      description: '청약통장 가입 24개월 이상, 납입횟수 24회 이상',
      met: input.subscriptionYears !== undefined && input.subscriptionYears >= 2,
      required: true,
    },
  ];

  const allMet = conditions.filter(c => c.required).every(c => c.met);

  return {
    type: 'special_first_home',
    eligible: allMet,
    conditions,
    note: allMet
      ? '생애최초 특별공급 신청 자격이 있습니다.'
      : '일부 조건을 충족하지 못했습니다.',
  };
}

/**
 * 다자녀가구 특별공급 자격 판정
 */
export function checkMultiChildEligibility(input: EligibilityInput): EligibilityResult {
  const conditions: EligibilityCondition[] = [
    {
      id: 'children',
      description: '만 19세 미만 자녀 3명 이상',
      met: input.childrenUnder19 !== undefined && input.childrenUnder19 >= 3,
      required: true,
    },
    {
      id: 'homeless',
      description: '무주택 세대구성원',
      met: input.isHomeless,
      required: true,
    },
  ];

  const allMet = conditions.filter(c => c.required).every(c => c.met);

  return {
    type: 'special_multi_child',
    eligible: allMet,
    conditions,
    note: allMet ? '다자녀가구 특별공급 신청 자격이 있습니다.' : '일부 조건을 충족하지 못했습니다.',
  };
}

/**
 * 노부모 부양 특별공급 자격 판정
 */
export function checkElderlyParentEligibility(input: EligibilityInput): EligibilityResult {
  const conditions: EligibilityCondition[] = [
    {
      id: 'elderly_parent',
      description: '만 65세 이상 직계존속 3년 이상 부양',
      met: input.isNursingElderlyParent,
      required: true,
    },
    {
      id: 'homeless',
      description: '세대원 전원 무주택',
      met: input.isHomeless,
      required: true,
    },
    {
      id: 'subscription_period',
      description: '청약통장 가입 5년 이상',
      met: input.subscriptionYears !== undefined && input.subscriptionYears >= 5,
      required: true,
    },
  ];

  const allMet = conditions.filter(c => c.required).every(c => c.met);

  return {
    type: 'special_elderly_parent',
    eligible: allMet,
    conditions,
    note: allMet ? '노부모 부양 특별공급 신청 자격이 있습니다.' : '일부 조건을 충족하지 못했습니다.',
  };
}
```

---

## TypeScript 타입 정의

### 가점 계산 관련 타입

```typescript
// types/score.ts

export interface ScoreInput {
  /** 무주택 여부 */
  isHomeless: boolean;
  /** 무주택 기간 (년, 소수점 포함) */
  homelessYears: number;
  /** 부양가족 수 (본인 제외) */
  dependentsCount: number;
  /** 청약통장 가입 기간 (년, 소수점 포함) */
  subscriptionYears: number;
}

export interface ScoreItemBreakdown {
  /** 획득 점수 */
  score: number;
  /** 최고 점수 */
  maxScore: number;
}

export interface HomelessnessBreakdown extends ScoreItemBreakdown {
  years: number;
}

export interface DependentsBreakdown extends ScoreItemBreakdown {
  count: number;
}

export interface SubscriptionBreakdown extends ScoreItemBreakdown {
  years: number;
}

export interface ScoreBreakdown {
  homelessness: HomelessnessBreakdown;
  dependents: DependentsBreakdown;
  subscription: SubscriptionBreakdown;
}

export interface ScoreResult {
  /** 총 가점 (0~84) */
  totalScore: number;
  /** 항목별 점수 내역 */
  breakdown: ScoreBreakdown;
}
```

### 자격 판정 관련 타입

```typescript
// types/eligibility.ts

export type EligibilityType =
  | 'general'
  | 'special_newlywed'
  | 'special_first_home'
  | 'special_multi_child'
  | 'special_elderly_parent';

export interface EligibilityCondition {
  /** 조건 식별자 */
  id: string;
  /** 조건 설명 */
  description: string;
  /** 조건 충족 여부 */
  met: boolean;
  /** 필수 조건 여부 */
  required: boolean;
}

export interface EligibilityResult {
  /** 공급 유형 */
  type: EligibilityType;
  /** 자격 여부 */
  eligible: boolean;
  /** 조건별 충족 여부 */
  conditions: EligibilityCondition[];
  /** 결과 안내 메시지 */
  note: string;
}

export interface EligibilityInput {
  /** 혼인 여부 */
  isMarried: boolean;
  /** 혼인 기간 (년) */
  marriageYears?: number;
  /** 무주택 여부 */
  isHomeless: boolean;
  /** 생애최초 주택 구입 여부 */
  isFirstHome: boolean;
  /** 만 19세 미만 자녀 수 */
  childrenUnder19?: number;
  /** 소득 비율 (도시근로자 월평균 대비) */
  incomeRatio?: number;
  /** 맞벌이 여부 */
  isBothWorking?: boolean;
  /** 청약통장 가입 기간 (년) */
  subscriptionYears?: number;
  /** 만 65세 이상 직계존속 3년 이상 부양 여부 */
  isNursingElderlyParent: boolean;
}

export interface EligibilitySummary {
  /** 판정 결과 목록 */
  results: EligibilityResult[];
  /** 자격 있는 공급 유형 */
  eligibleTypes: EligibilityType[];
  /** 판정 완료 여부 */
  isComplete: boolean;
}
```

### 공고 데이터 관련 타입

```typescript
// types/announcement.ts

export type AnnouncementType = 'APT' | 'OFTEL' | 'URBAN_LIVING' | 'MIXED';
export type AnnouncementStatus = 'upcoming' | 'ongoing' | 'closed';
export type SupplyType =
  | 'general'
  | 'special_newlywed'
  | 'special_first_home'
  | 'special_multi_child'
  | 'special_elderly_parent'
  | 'special_institution';

export interface AnnouncementSummary {
  id: string;
  name: string;
  region: string;
  district: string;
  type: AnnouncementType;
  totalUnits: number;
  supplyTypes: SupplyType[];
  applicationStartDate: string;
  applicationEndDate: string;
  announcementDate: string;
  status: AnnouncementStatus;
  minPrice?: number;
  maxPrice?: number;
  sourceUrl: string;
}

export interface AnnouncementDetail extends AnnouncementSummary {
  address: string;
  supplyDetails: Record<SupplyType, {
    units: number;
    eligibilityNote: string;
  }>;
  schedule: {
    announcementDate: string;
    applicationStartDate: string;
    applicationEndDate: string;
    winnerAnnouncementDate: string;
    contractStartDate: string;
    contractEndDate: string;
    expectedMoveInDate: string;
  };
  pricing: Array<{
    type: string;
    supplyArea: number;
    exclusiveArea: number;
    price: number;
  }>;
  contactInfo: {
    constructionCompany: string;
    phone: string;
    website?: string;
  };
  lastUpdated: string;
}

export interface AnnouncementQuery {
  region?: string;
  type?: AnnouncementType;
  page?: number;
  limit?: number;
  status?: AnnouncementStatus;
}

export interface PaginatedAnnouncements {
  items: AnnouncementSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}
```

---

## Step-by-Step 입력 UI 상태 관리

```typescript
// hooks/useEligibilityForm.ts

import { useState, useCallback } from 'react';
import { EligibilityInput, EligibilitySummary } from '@/types/eligibility';
import { calculateEligibility } from '@/lib/eligibility/calculator';

export type StepId =
  | 'household'      // 세대 구성 (혼인 여부, 자녀 수)
  | 'housing'        // 주택 보유 이력
  | 'income'         // 소득 정보
  | 'subscription'   // 청약통장 정보
  | 'result';        // 결과

interface UseEligibilityFormReturn {
  currentStep: StepId;
  stepIndex: number;
  totalSteps: number;
  formData: Partial<EligibilityInput>;
  result: EligibilitySummary | null;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  updateFormData: (data: Partial<EligibilityInput>) => void;
  calculateResult: () => void;
}

const STEP_ORDER: StepId[] = ['household', 'housing', 'income', 'subscription', 'result'];

export function useEligibilityForm(): UseEligibilityFormReturn {
  const [currentStep, setCurrentStep] = useState<StepId>('household');
  const [formData, setFormData] = useState<Partial<EligibilityInput>>({});
  const [result, setResult] = useState<EligibilitySummary | null>(null);

  const stepIndex = STEP_ORDER.indexOf(currentStep);

  const goToNextStep = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [stepIndex]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [stepIndex]);

  const updateFormData = useCallback((data: Partial<EligibilityInput>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const calculateResult = useCallback(() => {
    if (formData) {
      const summary = calculateEligibility(formData as EligibilityInput);
      setResult(summary);
    }
  }, [formData]);

  return {
    currentStep,
    stepIndex,
    totalSteps: STEP_ORDER.length - 1, // 'result' 제외
    formData,
    result,
    goToNextStep,
    goToPrevStep,
    updateFormData,
    calculateResult,
  };
}
```
