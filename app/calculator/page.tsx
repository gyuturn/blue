'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/StepIndicator';
import Disclaimer from '@/components/Disclaimer';
import { Tooltip } from '@/components/ui/Tooltip';
import { calcHomelessStartDate, calcHomelessYearsFromPolicy } from '@/lib/calculator';
import type { EligibilityInput } from '@/types';

const REGIONS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

const STEP_LABELS = ['무주택', '부양가족', '청약통장', '거주지역', '혼인/자녀'];

const TOTAL_STEPS = 5;

const defaultInput: EligibilityInput = {
  isHomeless: true,
  birthDate: '',
  homelessYears: 0,
  dependentsCount: 0,
  subscriptionStartDate: '',
  subscriptionPaymentCount: 0,
  subscriptionBalance: 0,
  region: '',
  isMarried: false,
  marriageDate: '',
  childrenCount: 0,
  hasRecentChild: false,
};

export default function CalculatorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<EligibilityInput>(defaultInput);

  const updateInput = <K extends keyof EligibilityInput>(
    key: K,
    value: EligibilityInput[K],
  ) => {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      // birthDate, isMarried, marriageDate 변경 시 homelessYears 자동 재계산
      if (key === 'birthDate' || key === 'isMarried' || key === 'marriageDate') {
        next.homelessYears = calcHomelessYearsFromPolicy(
          next.birthDate,
          next.isMarried,
          next.marriageDate,
        );
      }
      return next;
    });
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      // 결과 페이지로 이동 (쿼리스트링으로 데이터 전달)
      const params = new URLSearchParams({
        data: JSON.stringify(input),
      });
      router.push(`/result?${params.toString()}`);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            홈으로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">청약 가점 계산</h1>
          <p className="text-gray-500 text-sm mt-1">
            정확한 정보를 입력하면 더 정밀한 결과를 제공합니다.
          </p>
        </div>

        <StepIndicator
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          stepLabels={STEP_LABELS}
        />

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          {step === 1 && (
            <Step1
              isHomeless={input.isHomeless}
              birthDate={input.birthDate}
              isMarried={input.isMarried}
              marriageDate={input.marriageDate}
              homelessYears={input.homelessYears}
              onChange={updateInput}
            />
          )}
          {step === 2 && (
            <Step2
              dependentsCount={input.dependentsCount}
              onChange={updateInput}
            />
          )}
          {step === 3 && (
            <Step3
              subscriptionStartDate={input.subscriptionStartDate}
              subscriptionPaymentCount={input.subscriptionPaymentCount}
              subscriptionBalance={input.subscriptionBalance}
              onChange={updateInput}
            />
          )}
          {step === 4 && (
            <Step4 region={input.region} onChange={updateInput} />
          )}
          {step === 5 && (
            <Step5
              isMarried={input.isMarried}
              marriageDate={input.marriageDate}
              childrenCount={input.childrenCount}
              hasRecentChild={input.hasRecentChild}
              onChange={updateInput}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              이전
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-md"
          >
            {step === TOTAL_STEPS ? '결과 보기' : '다음'}
          </button>
        </div>

        <Disclaimer />
      </div>
    </main>
  );
}

// Step 1: 무주택 여부 및 기간
function Step1({
  isHomeless,
  birthDate,
  isMarried,
  marriageDate,
  homelessYears,
  onChange,
}: {
  isHomeless: boolean;
  birthDate: string;
  isMarried: boolean;
  marriageDate: string;
  homelessYears: number;
  onChange: <K extends keyof EligibilityInput>(
    key: K,
    value: EligibilityInput[K],
  ) => void;
}) {
  const startDate = calcHomelessStartDate(birthDate, isMarried, marriageDate);
  const isUnder30Single = isHomeless && birthDate && !isMarried && startDate === null;

  const startDateLabel = (() => {
    if (!startDate) return null;
    return `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월`;
  })();

  const homelessYearsFloor = Math.floor(homelessYears);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        <Tooltip content="세대원 전원이 현재 주택을 소유하지 않은 상태를 말합니다. 세대원 중 한 명이라도 주택을 소유하면 무주택자로 인정되지 않습니다.">
          <span>무주택 여부 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
        </Tooltip>
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        현재 주택을 소유하고 있지 않으신가요?
      </p>

      <div className="space-y-3 mb-6">
        <button
          onClick={() => onChange('isHomeless', true)}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            isHomeless
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                isHomeless ? 'border-blue-600' : 'border-gray-300'
              }`}
            >
              {isHomeless && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">무주택자입니다</p>
              <p className="text-gray-500 text-xs">
                현재 소유한 주택이 없습니다
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onChange('isHomeless', false)}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            !isHomeless
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                !isHomeless ? 'border-blue-600' : 'border-gray-300'
              }`}
            >
              {!isHomeless && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">주택 소유자입니다</p>
              <p className="text-gray-500 text-xs">현재 주택을 보유하고 있습니다</p>
            </div>
          </div>
        </button>
      </div>

      {isHomeless && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Tooltip content="무주택기간 산정 시작일은 만 30세 생일 또는 혼인신고일 중 빠른 날입니다. 만 30세 미만 미혼인 경우 산정되지 않습니다.">
              <span>생년월일 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
            </Tooltip>
          </label>
          <input
            type="month"
            value={birthDate}
            onChange={(e) => onChange('birthDate', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="YYYY-MM"
          />

          {isUnder30Single && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 font-medium">
                만 30세 미만 미혼인 경우 무주택기간이 산정되지 않습니다.
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                만 30세가 되는 날부터 무주택기간이 시작됩니다.
              </p>
            </div>
          )}

          {startDate && birthDate && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">무주택기간 자동 계산 결과</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">산정 시작일</span>
                <span className="text-xs font-semibold text-gray-800">{startDateLabel}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-600">무주택기간</span>
                <span className="text-xs font-semibold text-blue-700">{homelessYearsFloor}년</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-600">예상 점수</span>
                <span className="text-xs font-semibold text-blue-700">
                  {homelessYearsFloor <= 0 ? 2 : Math.min(homelessYearsFloor * 2, 32)}점 / 32점
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Step 2: 부양가족 수
function Step2({
  dependentsCount,
  onChange,
}: {
  dependentsCount: number;
  onChange: <K extends keyof EligibilityInput>(
    key: K,
    value: EligibilityInput[K],
  ) => void;
}) {
  const scoreMap = [5, 10, 15, 20, 25, 30, 35];
  const score = scoreMap[Math.min(dependentsCount, 6)];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        <Tooltip content="주민등록상 같은 세대에 등록된 배우자, 직계존속(부모·조부모), 직계비속(자녀·손자녀)을 포함합니다. 최대 35점이며 6명 이상이면 만점입니다.">
          <span>부양가족 수 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
        </Tooltip>
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        배우자, 자녀, 직계존속(부모님 등) 모두 포함하여 입력하세요.
      </p>

      <div className="flex items-center justify-center gap-6 mb-4">
        <button
          onClick={() =>
            onChange('dependentsCount', Math.max(0, dependentsCount - 1))
          }
          className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700 transition-colors"
        >
          -
        </button>
        <div className="text-center">
          <span className="text-5xl font-bold text-blue-600">
            {dependentsCount}
          </span>
          <p className="text-gray-500 text-sm mt-1">명</p>
        </div>
        <button
          onClick={() => onChange('dependentsCount', Math.min(6, dependentsCount + 1))}
          className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-700 transition-colors"
        >
          +
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 text-center">
        <p className="text-sm text-gray-600">
          부양가족 점수:{' '}
          <span className="font-bold text-blue-600 text-lg">{score}점</span>{' '}
          / 35점
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            onClick={() => onChange('dependentsCount', n)}
            className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
              dependentsCount === n
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n === 6 ? '6+' : n}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        빠른 선택: 인원 수를 클릭하세요
      </p>
    </div>
  );
}

function formatMonthsToYears(months: number): string {
  if (months <= 0) return '';
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${months}회 = ${months}개월`;
  if (remaining === 0) return `${months}회 = 약 ${years}년`;
  return `${months}회 = 약 ${years}년 ${remaining}개월`;
}

function formatWithComma(value: number): string {
  if (value <= 0) return '';
  return value.toLocaleString('ko-KR');
}


// Step 3: 청약통장 정보
function Step3({
  subscriptionStartDate,
  subscriptionPaymentCount,
  subscriptionBalance,
  onChange,
}: {
  subscriptionStartDate: string;
  subscriptionPaymentCount: number;
  subscriptionBalance: number;
  onChange: <K extends keyof EligibilityInput>(
    key: K,
    value: EligibilityInput[K],
  ) => void;
}) {
  const [displayBalance, setDisplayBalance] = useState(formatWithComma(subscriptionBalance));

  const paymentHint = formatMonthsToYears(subscriptionPaymentCount);
  const wonDisplay = subscriptionBalance > 0
    ? `= ${(subscriptionBalance * 10000).toLocaleString('ko-KR')}원`
    : null;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        <Tooltip content="주택청약종합저축 등 청약 신청을 위한 전용 통장입니다. 가입 기간과 납입 횟수가 가점에 반영됩니다.">
          <span>청약통장 정보 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
        </Tooltip>
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        청약통장(주택청약종합저축) 가입 정보를 입력하세요.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            가입 시작월
          </label>
          <input
            type="month"
            value={subscriptionStartDate}
            onChange={(e) => onChange('subscriptionStartDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Tooltip content="청약통장에 납입한 총 횟수입니다. 생애최초 특별공급은 12회 이상, 가점 만점(17점)은 24회 이상이 필요합니다.">
              <span>납입 횟수 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
            </Tooltip>
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              value={subscriptionPaymentCount === 0 ? '' : subscriptionPaymentCount}
              onChange={(e) =>
                onChange('subscriptionPaymentCount', Number(e.target.value) || 0)
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              placeholder="예: 60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              회
            </span>
          </div>
          {paymentHint ? (
            <p className="text-xs text-blue-500 mt-1">💡 {paymentHint}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              생애최초 특별공급은 12회 이상 납입 필요
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Tooltip content="민영주택 청약 시 필요한 지역별 최소 예치 금액입니다. 서울 85㎡ 초과는 1,500만원 이상이 필요합니다.">
              <span>예치 금액 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
            </Tooltip>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={displayBalance}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const num = Number(raw) || 0;
                setDisplayBalance(raw === '' ? '' : num.toLocaleString('ko-KR'));
                onChange('subscriptionBalance', num);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              placeholder="예: 1,500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              만원
            </span>
          </div>
          {wonDisplay ? (
            <p className="text-xs text-blue-500 mt-1">💡 {wonDisplay}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              서울 85m² 초과: 1,500만원 이상 필요
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 4: 거주 지역 선택
function Step4({
  region,
  onChange,
}: {
  region: string;
  onChange: <K extends keyof EligibilityInput>(
    key: K,
    value: EligibilityInput[K],
  ) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">거주 지역</h2>
      <p className="text-gray-500 text-sm mb-5">
        현재 거주하시는 지역을 선택하세요.
      </p>

      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => onChange('region', r)}
            className={`py-3 px-3 rounded-xl text-sm font-medium text-left transition-all ${
              region === r
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {region && (
        <div className="mt-3 p-3 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-700">
            선택됨:{' '}
            <span className="font-semibold">{region}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Step 5: 혼인 및 자녀 정보
function Step5({
  isMarried,
  marriageDate,
  childrenCount,
  hasRecentChild,
  onChange,
}: {
  isMarried: boolean;
  marriageDate: string;
  childrenCount: number;
  hasRecentChild: boolean;
  onChange: <K extends keyof EligibilityInput>(
    key: K,
    value: EligibilityInput[K],
  ) => void;
}) {
  const today = new Date().toISOString().slice(0, 7);

  const marriageYearsHint = (() => {
    if (!marriageDate) return null;
    const [y, m] = marriageDate.split('-').map(Number);
    if (!y || !m) return null;
    const diffMs = new Date().getTime() - new Date(y, m - 1, 1).getTime();
    const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const label = years > 0 ? `${years}년 ${months > 0 ? `${months}개월` : ''}`.trim() : `${months}개월`;
    const eligible = diffMs / (1000 * 60 * 60 * 24 * 365.25) <= 7;
    return eligible ? `혼인 ${label} → 신혼부부 특공 자격 있음` : `혼인 ${label} → 7년 초과로 자격 없음`;
  })();

  const childrenHint = childrenCount >= 3
    ? '다자녀 특공 자격 있음'
    : `${3 - childrenCount}명 더 있으면 다자녀 특공 가능`;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        <Tooltip content="특별공급 자격 판정에 사용됩니다. 신혼부부·생애최초·다자녀 등 정책적 배려 계층에게 별도 물량을 공급하는 제도입니다.">
          <span>혼인 및 자녀 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
        </Tooltip>
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        <Tooltip term={TERM_MAP.teukbyeol.term} definition={TERM_MAP.teukbyeol.shortDef}>특별공급</Tooltip> 자격 판정에 사용됩니다.
      </p>

      <div className="space-y-4">
        {/* 혼인 여부 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            <Tooltip content="혼인 후 7년 이내이면 신혼부부 특별공급 자격이 생깁니다.">
              <span>혼인 여부 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
            </Tooltip>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onChange('isMarried', true)}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                isMarried ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              기혼
            </button>
            <button
              onClick={() => {
                onChange('isMarried', false);
                onChange('marriageDate', '');
              }}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                !isMarried ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              미혼
            </button>
          </div>
        </div>

        {/* 혼인 날짜 — 기혼일 때만 표시 */}
        {isMarried && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              혼인 날짜
            </label>
            <input
              type="month"
              max={today}
              value={marriageDate}
              onChange={(e) => onChange('marriageDate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
            />
            {marriageYearsHint && (
              <p className={`text-xs mt-1 ${marriageYearsHint.includes('없음') ? 'text-red-500' : 'text-blue-500'}`}>
                💡 {marriageYearsHint}
              </p>
            )}
          </div>
        )}

        {/* 미성년 자녀 수 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            <Tooltip content="만 19세 미만 자녀 수입니다. 3명 이상이면 다자녀 특별공급 자격이 생깁니다.">
              <span>미성년 자녀 수 <span className="font-normal text-gray-400">(만 19세 미만)</span> <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
            </Tooltip>
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onChange('childrenCount', Math.max(0, childrenCount - 1))}
              className="w-12 h-12 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-600 hover:border-blue-400 transition-colors flex items-center justify-center"
            >
              −
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{childrenCount}</span>
            <button
              onClick={() => onChange('childrenCount', childrenCount + 1)}
              className="w-12 h-12 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-600 hover:border-blue-400 transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
          <p className={`text-xs mt-1.5 ${childrenCount >= 3 ? 'text-blue-500' : 'text-gray-400'}`}>
            💡 {childrenHint}
          </p>
        </div>

        {/* 최근 2년 이내 출산 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            최근 2년 이내 자녀 출산 여부
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onChange('hasRecentChild', true)}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                hasRecentChild ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              있음
            </button>
            <button
              onClick={() => onChange('hasRecentChild', false)}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                !hasRecentChild ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              없음
            </button>
          </div>
          {hasRecentChild && (
            <p className="text-xs text-blue-600 mt-1.5">출산가구 우대 혜택 적용 가능</p>
          )}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700">
            정확한 특별공급 자격은 공고문을 반드시 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
