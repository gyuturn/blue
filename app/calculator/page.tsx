'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/StepIndicator';
import Disclaimer from '@/components/Disclaimer';
import { useLocalStorageItem } from '@/hooks/useLocalStorage';
import {
  calcHomelessStartDate,
  calcHomelessYearsFromPolicy,
  calculateTotalScore,
} from '@/lib/calculator';
import {
  CALC_DRAFT_KEY,
  parseCalcDraft,
  refreshInput,
  resultUrl,
  serializeCalcDraft,
} from '@/lib/scoreStorage';
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

const STEP_LABELS = ['집', '결혼', '가족', '청약통장', '사는 곳', '자녀'];

const TOTAL_STEPS = STEP_LABELS.length;

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

type OnChange = <K extends keyof EligibilityInput>(key: K, value: EligibilityInput[K]) => void;

function clampStep(step: number) {
  return Math.min(Math.max(step, 1), TOTAL_STEPS);
}

export default function CalculatorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<EligibilityInput>(defaultInput);
  const [draftRaw, setDraftRaw] = useLocalStorageItem(CALC_DRAFT_KEY);
  const draft = useMemo(() => parseCalcDraft(draftRaw), [draftRaw]);
  // 이전 작성분이 있을 때 이어할지 정하기 전에는 draft를 덮어쓰지 않는다
  const [resumeDecided, setResumeDecided] = useState(false);
  const showResumeBanner = !!draft && !resumeDecided;

  useEffect(() => {
    if (!resumeDecided) return;
    const pristine = step === 1 && JSON.stringify(input) === JSON.stringify(defaultInput);
    if (!pristine) setDraftRaw(serializeCalcDraft(input, step));
  }, [input, step, resumeDecided, setDraftRaw]);

  const score = useMemo(() => calculateTotalScore(input), [input]);

  // 단계가 바뀌면 새 질문으로 초점을 옮겨 스크린리더가 질문을 읽게 한다 (첫 진입은 제외)
  const stepChangedRef = useRef(false);
  useEffect(() => {
    if (!stepChangedRef.current) {
      stepChangedRef.current = true;
      return;
    }
    document.getElementById('question-title')?.focus({ preventScroll: true });
  }, [step]);

  const resumeDraft = () => {
    if (!draft) return;
    setInput(refreshInput(draft.input));
    setStep(clampStep(draft.step));
    setResumeDecided(true);
  };

  const startOver = () => {
    setDraftRaw(null);
    setResumeDecided(true);
  };

  const updateInput: OnChange = (key, value) => {
    setResumeDecided(true);
    setInput((prev) => {
      const next = { ...prev, [key]: value };
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
    setResumeDecided(true);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
    } else {
      router.push(resultUrl(input));
    }
  };

  const handleBack = () => {
    setResumeDecided(true);
    if (step > 1) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0 });
    } else {
      router.push('/');
    }
  };

  // 점수에 들어가는 항목만 단계별로 더해 "지금까지"를 보여준다
  const scoreSoFar =
    step <= 2
      ? score.homelessScore
      : step === 3
        ? score.homelessScore + score.dependentsScore
        : score.totalScore;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-5">
        <div className="sticky top-14 z-10 bg-white pt-3 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              aria-label={step > 1 ? '이전 질문' : '홈으로'}
              className="-ml-2 p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
          </div>
        </div>

        {showResumeBanner && draft && (
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900">지난번에 입력하던 내용이 있어요</p>
            <p className="text-xs text-gray-500 mt-0.5">
              &lsquo;{STEP_LABELS[clampStep(draft.step) - 1]}&rsquo; 질문에서 멈췄어요
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={resumeDraft}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                이어서 하기
              </button>
              <button
                onClick={startOver}
                className="flex-1 py-2.5 rounded-xl bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                처음부터
              </button>
            </div>
          </div>
        )}

        <div key={step} className="animate-fade-slide-in pb-6">
          {step === 1 && (
            <HomeStep
              isHomeless={input.isHomeless}
              birthDate={input.birthDate}
              isMarried={input.isMarried}
              marriageDate={input.marriageDate}
              homelessYears={input.homelessYears}
              homelessScore={score.homelessScore}
              onChange={updateInput}
            />
          )}
          {step === 2 && (
            <MarriageStep
              isHomeless={input.isHomeless}
              isMarried={input.isMarried}
              marriageDate={input.marriageDate}
              onChange={updateInput}
            />
          )}
          {step === 3 && (
            <FamilyStep
              dependentsCount={input.dependentsCount}
              dependentsScore={score.dependentsScore}
              onChange={updateInput}
            />
          )}
          {step === 4 && (
            <AccountStep
              subscriptionStartDate={input.subscriptionStartDate}
              subscriptionPaymentCount={input.subscriptionPaymentCount}
              subscriptionBalance={input.subscriptionBalance}
              subscriptionScore={score.subscriptionScore}
              onChange={updateInput}
            />
          )}
          {step === 5 && <RegionStep region={input.region} onChange={updateInput} />}
          {step === 6 && (
            <ChildrenStep
              childrenCount={input.childrenCount}
              hasRecentChild={input.hasRecentChild}
              onChange={updateInput}
            />
          )}
        </div>

        <Disclaimer />
        <div className="h-44" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white pt-3">
        <div className="max-w-md mx-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-sm text-gray-500 mb-2" aria-live="polite">
            {step <= 4 ? (
              <>
                지금까지 예상 <span className="font-bold text-blue-600 tabular-nums">{scoreSoFar}점</span>
                <span className="text-gray-400"> / 84점</span>
              </>
            ) : (
              '이 질문은 점수와 상관없어요 · 특별공급 확인용'
            )}
          </p>
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-base font-semibold transition-all"
          >
            {step === TOTAL_STEPS ? '내 점수 보기' : '다음'}
          </button>
        </div>
      </div>
    </main>
  );
}

function Question({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1
        id="question-title"
        tabIndex={-1}
        className="text-[26px] leading-snug font-bold text-gray-900 whitespace-pre-line focus:outline-none"
      >
        {title}
      </h1>
      {description && <p className="text-[15px] text-gray-500 mt-2 leading-relaxed">{description}</p>}
    </div>
  );
}

function WhyAsk({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-6 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-gray-700 [&::-webkit-details-marker]:hidden">
        왜 물어보나요?
        <svg
          className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="mt-2 space-y-1.5 leading-relaxed">{children}</div>
    </details>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition-colors ${
        selected ? 'bg-blue-50 ring-2 ring-blue-600' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <span>
        <span className={`block text-base font-semibold ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
          {title}
        </span>
        {description && <span className="block text-sm text-gray-500 mt-0.5">{description}</span>}
      </span>
      <span
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
          selected ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    </button>
  );
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-2">
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-2xl bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600';

function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div
      className={`mt-3 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
      }`}
    >
      {children}
    </div>
  );
}

function HomeStep({
  isHomeless,
  birthDate,
  isMarried,
  marriageDate,
  homelessYears,
  homelessScore,
  onChange,
}: {
  isHomeless: boolean;
  birthDate: string;
  isMarried: boolean;
  marriageDate: string;
  homelessYears: number;
  homelessScore: number;
  onChange: OnChange;
}) {
  const startDate = calcHomelessStartDate(birthDate, isMarried, marriageDate);
  const notCountedYet = isHomeless && birthDate && startDate === null;

  return (
    <div>
      <Question
        title="지금 내 집이 있나요?"
        description="나, 배우자, 같은 주민등록등본에 있는 가족 중 한 명이라도 집이 있으면 '있어요'를 골라 주세요."
      />
      <div className="space-y-3">
        <ChoiceCard
          selected={isHomeless}
          onClick={() => onChange('isHomeless', true)}
          title="없어요"
          description="나도, 함께 사는 가족도 집이 없어요"
        />
        <ChoiceCard
          selected={!isHomeless}
          onClick={() => onChange('isHomeless', false)}
          title="있어요"
          description="나나 가족 중 누군가 집이 있어요"
        />
      </div>

      {isHomeless && (
        <div className="mt-8">
          <FieldLabel htmlFor="birthDate">태어난 해와 달을 알려주세요</FieldLabel>
          <input
            id="birthDate"
            type="month"
            value={birthDate}
            onChange={(e) => onChange('birthDate', e.target.value)}
            className={inputClass}
          />
          {notCountedYet && (
            <Note tone="warn">
              만 30세 전이고 결혼하지 않았다면 아직 기간이 쌓이지 않아요. 만 30세 생일부터 세기 시작해요.
              <br />
              결혼했다면 다음 질문에서 알려주세요. 결혼한 날부터 셀 수 있어요.
            </Note>
          )}
          {startDate && (
            <Note>
              {startDate.getFullYear()}년 {startDate.getMonth() + 1}월부터 약{' '}
              <strong>{Math.floor(homelessYears)}년</strong> 동안 집 없이 지냈어요 →{' '}
              <strong>{homelessScore}점</strong>
              <span className="text-blue-600"> / 32점</span>
            </Note>
          )}
        </div>
      )}

      {!isHomeless && (
        <Note tone="warn">
          집이 있으면 무주택 점수는 0점이에요. 나머지 항목은 계속 계산해 드릴게요.
        </Note>
      )}

      <WhyAsk>
        <p>집이 없는 기간이 길수록 청약 점수가 올라가요. 최대 32점이에요.</p>
        <p className="text-gray-500">
          기간은 만 30세 생일부터 세요. 그전에 결혼했다면 결혼한 날부터 세요.
        </p>
      </WhyAsk>
    </div>
  );
}

function MarriageStep({
  isHomeless,
  isMarried,
  marriageDate,
  onChange,
}: {
  isHomeless: boolean;
  isMarried: boolean;
  marriageDate: string;
  onChange: OnChange;
}) {
  const today = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <Question
        title="결혼했나요?"
        description="혼인신고를 했는지 기준으로 골라 주세요."
      />
      <div className="space-y-3">
        <ChoiceCard selected={isMarried} onClick={() => onChange('isMarried', true)} title="네, 했어요" />
        <ChoiceCard
          selected={!isMarried}
          onClick={() => {
            onChange('isMarried', false);
            onChange('marriageDate', '');
          }}
          title="아니요"
        />
      </div>

      {isMarried && (
        <div className="mt-8">
          <FieldLabel htmlFor="marriageDate">혼인신고한 해와 달</FieldLabel>
          <input
            id="marriageDate"
            type="month"
            max={today}
            value={marriageDate}
            onChange={(e) => onChange('marriageDate', e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <WhyAsk>
        {isHomeless && <p>만 30세 전에 결혼했다면 무주택 기간을 결혼한 날부터 셀 수 있어요.</p>}
        {isHomeless && <p>결혼한 지 7년이 안 됐다면 신혼부부 특별공급을 받을 수 있는지도 확인해 드려요.</p>}
        {!isHomeless && <p>결혼 여부는 특별공급 자격을 확인하는 데 써요.</p>}
      </WhyAsk>
    </div>
  );
}

function FamilyStep({
  dependentsCount,
  dependentsScore,
  onChange,
}: {
  dependentsCount: number;
  dependentsScore: number;
  onChange: OnChange;
}) {
  return (
    <div>
      <Question
        title="함께 사는 가족은 몇 명인가요?"
        description="나는 빼고 세어 주세요. 배우자와, 같은 주민등록등본에 있는 부모님·조부모님, 자녀가 해당돼요."
      />

      <div className="flex items-center justify-center gap-8 py-4">
        <button
          type="button"
          aria-label="한 명 줄이기"
          onClick={() => onChange('dependentsCount', Math.max(0, dependentsCount - 1))}
          className="h-14 w-14 rounded-full bg-gray-100 text-2xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
        >
          −
        </button>
        <p className="text-center">
          <span className="text-6xl font-bold text-gray-900 tabular-nums" aria-live="polite">{dependentsCount}</span>
          <span className="text-xl text-gray-500 ml-1">명{dependentsCount >= 6 ? ' 이상' : ''}</span>
        </p>
        <button
          type="button"
          aria-label="한 명 늘리기"
          onClick={() => onChange('dependentsCount', Math.min(6, dependentsCount + 1))}
          className="h-14 w-14 rounded-full bg-gray-100 text-2xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>

      <Note>
        가족 {dependentsCount}명{dependentsCount >= 6 ? ' 이상' : ''} → <strong>{dependentsScore}점</strong>
        <span className="text-blue-600"> / 35점</span>
      </Note>

      <WhyAsk>
        <p>함께 사는 가족이 많을수록 점수가 올라가요. 0명이면 5점, 1명마다 5점씩 더해서 6명 이상이면 35점이에요.</p>
        <p className="text-gray-500">
          배우자는 등본이 달라도 인정돼요. 부모님·조부모님은 3년 이상 같은 등본에 있고 집이 없어야 인정되고, 손주는 그
          부모가 없을 때만 인정돼요.
        </p>
      </WhyAsk>
    </div>
  );
}

function formatMonthsToYears(months: number): string {
  if (months <= 0) return '';
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${months}개월 동안 냈어요`;
  if (remaining === 0) return `약 ${years}년 동안 냈어요`;
  return `약 ${years}년 ${remaining}개월 동안 냈어요`;
}

function formatWithComma(value: number): string {
  if (value <= 0) return '';
  return value.toLocaleString('ko-KR');
}

function AccountStep({
  subscriptionStartDate,
  subscriptionPaymentCount,
  subscriptionBalance,
  subscriptionScore,
  onChange,
}: {
  subscriptionStartDate: string;
  subscriptionPaymentCount: number;
  subscriptionBalance: number;
  subscriptionScore: number;
  onChange: OnChange;
}) {
  const [displayBalance, setDisplayBalance] = useState(formatWithComma(subscriptionBalance));
  const paymentHint = formatMonthsToYears(subscriptionPaymentCount);

  return (
    <div>
      <Question
        title="청약통장은 언제 만들었나요?"
        description="은행 앱에서 '주택청약종합저축' 가입일을 확인할 수 있어요. 잘 모르겠다면 비워 두고 넘어가도 돼요."
      />

      <FieldLabel htmlFor="subscriptionStartDate">가입한 해와 달</FieldLabel>
      <input
        id="subscriptionStartDate"
        type="month"
        value={subscriptionStartDate}
        onChange={(e) => onChange('subscriptionStartDate', e.target.value)}
        className={inputClass}
      />
      <Note>
        {subscriptionStartDate ? '가입 기간' : '가입일을 비워 두면 가장 낮은 점수로 계산해요'} →{' '}
        <strong>{subscriptionScore}점</strong>
        <span className="text-blue-600"> / 17점</span>
      </Note>

      <div className="mt-8 space-y-6">
        <p className="text-sm text-gray-500">
          아래 두 가지는 점수에 들어가지 않아요. 특별공급과 지역별 기준을 확인하는 데 써요.
        </p>
        <div>
          <FieldLabel htmlFor="subscriptionPaymentCount">지금까지 몇 번 냈나요?</FieldLabel>
          <div className="relative">
            <input
              id="subscriptionPaymentCount"
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              value={subscriptionPaymentCount === 0 ? '' : subscriptionPaymentCount}
              onChange={(e) => onChange('subscriptionPaymentCount', Number(e.target.value) || 0)}
              className={`${inputClass} pr-12`}
              placeholder="예: 60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">회</span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {paymentHint || '생애최초 특별공급은 12번 이상 내야 해요'}
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="subscriptionBalance">통장에 모인 돈은 얼마인가요?</FieldLabel>
          <div className="relative">
            <input
              id="subscriptionBalance"
              type="text"
              inputMode="numeric"
              value={displayBalance}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const num = Number(raw) || 0;
                setDisplayBalance(raw === '' ? '' : num.toLocaleString('ko-KR'));
                onChange('subscriptionBalance', num);
              }}
              className={`${inputClass} pr-14`}
              placeholder="예: 1,500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">만원</span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {subscriptionBalance > 0
              ? `${(subscriptionBalance * 10000).toLocaleString('ko-KR')}원`
              : '민간 아파트는 지역·면적마다 필요한 금액이 달라요 (서울은 전용 85㎡ 이하 300만원, 모든 면적 1,500만원)'}
          </p>
        </div>
      </div>

      <WhyAsk>
        <p>청약통장을 오래 가지고 있을수록 점수가 올라가요. 최대 17점이에요.</p>
      </WhyAsk>
    </div>
  );
}

function RegionStep({ region, onChange }: { region: string; onChange: OnChange }) {
  return (
    <div>
      <Question
        title="지금 어디에 살고 있나요?"
        description="지역마다 청약할 수 있는 곳과 필요한 예치금이 달라요."
      />
      <div className="grid grid-cols-2 gap-2">
        {REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange('region', r)}
            aria-pressed={region === r}
            className={`rounded-2xl px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${
              region === r ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-600' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChildrenStep({
  childrenCount,
  hasRecentChild,
  onChange,
}: {
  childrenCount: number;
  hasRecentChild: boolean;
  onChange: OnChange;
}) {
  return (
    <div>
      <Question
        title="자녀가 있나요?"
        description="만 19세가 안 된 자녀 수를 알려주세요. 없으면 0명 그대로 두면 돼요."
      />

      <div className="flex items-center justify-center gap-8 py-4">
        <button
          type="button"
          aria-label="한 명 줄이기"
          onClick={() => onChange('childrenCount', Math.max(0, childrenCount - 1))}
          className="h-14 w-14 rounded-full bg-gray-100 text-2xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
        >
          −
        </button>
        <p className="text-center">
          <span className="text-6xl font-bold text-gray-900 tabular-nums" aria-live="polite">{childrenCount}</span>
          <span className="text-xl text-gray-500 ml-1">명</span>
        </p>
        <button
          type="button"
          aria-label="한 명 늘리기"
          onClick={() => onChange('childrenCount', childrenCount + 1)}
          className="h-14 w-14 rounded-full bg-gray-100 text-2xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
        >
          +
        </button>
      </div>
      {childrenCount >= 3 ? (
        <Note>자녀가 3명 이상이라 다자녀 특별공급을 확인해 볼 수 있어요.</Note>
      ) : (
        <p className="text-center text-sm text-gray-500">
          자녀가 3명 이상이면 다자녀 특별공급을 확인해 볼 수 있어요
        </p>
      )}

      <div className="mt-8">
        <p className="text-sm font-semibold text-gray-700 mb-2">최근 2년 안에 아이를 낳았나요?</p>
        <div className="grid grid-cols-2 gap-3">
          <ChoiceCard selected={hasRecentChild} onClick={() => onChange('hasRecentChild', true)} title="네" />
          <ChoiceCard selected={!hasRecentChild} onClick={() => onChange('hasRecentChild', false)} title="아니요" />
        </div>
      </div>

      <WhyAsk>
        <p>
          신혼부부·다자녀 같은 특별공급은 일반 청약과 따로 정해진 물량을 먼저 배정해요. 받을 수 있는지 확인하는 데 써요.
        </p>
        <p className="text-gray-500">정확한 특별공급 자격은 공고문에서 꼭 확인하세요.</p>
      </WhyAsk>
    </div>
  );
}
