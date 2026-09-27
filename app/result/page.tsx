'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Disclaimer from '@/components/Disclaimer';
import { calcHomelessStartDate, calculateTotalScore, calculateSpecialSupply } from '@/lib/calculator';
import { useCountUp } from '@/hooks/useCountUp';
import Tooltip from '@/components/Tooltip';
import { TERM_MAP } from '@/lib/terms';
import { useLocalStorageItem } from '@/hooks/useLocalStorage';
import {
  CALC_DRAFT_KEY,
  LAST_SCORE_KEY,
  isEligibilityInput,
  markSyncAfterLogin,
  parseSavedScore,
  refreshInput,
  scorePostBody,
  serializeSavedScore,
} from '@/lib/scoreStorage';
import type { EligibilityInput, ScoreResult, SpecialSupplyEligibility, StoredScoreData } from '@/types';
import type { SessionUser } from '@/types/auth';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastScoreRaw, setLastScoreRaw] = useLocalStorageItem(LAST_SCORE_KEY);
  const [, setDraftRaw] = useLocalStorageItem(CALC_DRAFT_KEY);
  // 홈의 "결과 다시 보기"로 들어온 경우 새 계산이 아니므로 다시 저장하지 않는다
  const fromSaved = searchParams.get('from') === 'saved';

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user: SessionUser | null) => setSessionUser(user))
      .catch(() => setSessionUser(null));
  }, []);

  const data = useMemo(() => {
    const dataParam = searchParams.get('data');
    if (!dataParam) return null;
    try {
      const parsed: EligibilityInput = refreshInput(JSON.parse(dataParam));
      return {
        input: parsed,
        // 필드가 빠진 예전 링크는 보여주기만 하고 저장하지 않는다
        storable: isEligibilityInput(parsed),
        scoreResult: calculateTotalScore(parsed),
        specialSupply: calculateSpecialSupply(parsed),
      };
    } catch {
      return null;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!data) {
      router.push('/calculator');
      return;
    }
    const scoreData: StoredScoreData = {
      input: data.input,
      result: data.scoreResult,
      specialSupply: data.specialSupply,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem('scoreData', JSON.stringify(scoreData));
    } catch {}
  }, [data, router]);

  useEffect(() => {
    if (!data || fromSaved || !data.storable) return;
    setDraftRaw(null);
    setLastScoreRaw(serializeSavedScore(data.input, Date.now()));
  }, [data, fromSaved, setLastScoreRaw, setDraftRaw]);

  const savedOnDevice = useMemo(() => {
    const saved = parseSavedScore(lastScoreRaw);
    return !!data && !!saved && JSON.stringify(saved.input) === JSON.stringify(data.input);
  }, [data, lastScoreRaw]);

  useEffect(() => {
    if (!data || fromSaved || !data.storable || sessionUser === undefined || sessionUser === null) return;
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: scorePostBody(data.input),
    })
      .then((res) => {
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      })
      .catch(() => setSaveStatus('error'));
  }, [data, fromSaved, sessionUser]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">계산 중...</p>
        </div>
      </div>
    );
  }

  return (
    <ResultView
      data={data}
      showDeviceSaved={sessionUser === null && savedOnDevice}
      showAccountSaved={!!sessionUser && saveStatus === 'saved'}
      showSaveError={!!sessionUser && saveStatus === 'error'}
      onRecalculate={() => router.push('/calculator')}
      onAnnouncements={() => router.push('/announcements')}
    />
  );
}

const TIER_LABEL: Record<ScoreResult['tier'], string> = {
  S: 'S등급 · 최상위',
  A: 'A등급 · 높은 편',
  B: 'B등급 · 보통',
  C: 'C등급 · 쌓아가는 중',
};

function homelessReason(input: EligibilityInput): string {
  if (!input.isHomeless) return '집이 있어서 0점이에요';
  if (!input.birthDate) return '태어난 해와 달을 입력하지 않았어요';
  if (!calcHomelessStartDate(input.birthDate, input.isMarried, input.marriageDate)) {
    return input.isMarried && !input.marriageDate
      ? '혼인신고 날짜가 없어 기간을 셀 수 없었어요'
      : '만 30세 전이고 결혼 전이라 아직 기간이 쌓이지 않았어요';
  }
  return `집 없이 지낸 기간 약 ${Math.floor(input.homelessYears)}년`;
}

function subscriptionReason(input: EligibilityInput): string {
  if (!input.subscriptionStartDate) return '가입일을 입력하지 않았어요';
  const [y, m] = input.subscriptionStartDate.split('-').map(Number);
  return y && m ? `${y}년 ${m}월에 가입` : '가입일을 확인하지 못했어요';
}

function marriageDescription(input: EligibilityInput, eligible: boolean): string {
  if (!input.isMarried) return '결혼 7년 이내 부부가 대상이에요';
  if (!input.marriageDate) return '혼인신고 날짜를 입력하지 않았어요';
  const [y, m] = input.marriageDate.split('-').map(Number);
  const diffMs = new Date().getTime() - new Date(y, m - 1, 1).getTime();
  const totalMonths = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const label = years > 0 ? `결혼 ${years}년${months > 0 ? ` ${months}개월` : ''}` : `결혼 ${months}개월`;
  return eligible ? `${label} · 7년 이내예요` : `${label} · 7년이 지났어요`;
}

function ResultView({
  data,
  showDeviceSaved,
  showAccountSaved,
  showSaveError,
  onRecalculate,
  onAnnouncements,
}: {
  data: { input: EligibilityInput; scoreResult: ScoreResult; specialSupply: SpecialSupplyEligibility };
  showDeviceSaved: boolean;
  showAccountSaved: boolean;
  showSaveError: boolean;
  onRecalculate: () => void;
  onAnnouncements: () => void;
}) {
  const { scoreResult, specialSupply, input } = data;
  const displayScore = useCountUp(scoreResult.totalScore);

  const scoreItems = [
    {
      key: 'homeless',
      label: <Tooltip term={TERM_MAP.mujiutaekGigan.term} definition={TERM_MAP.mujiutaekGigan.shortDef}>무주택 기간</Tooltip>,
      score: scoreResult.homelessScore,
      maxScore: 32,
      reason: homelessReason(input),
      tip: '집 없이 지낸 기간이 1년 늘 때마다 2점씩 올라요',
    },
    {
      key: 'dependents',
      label: <Tooltip term={TERM_MAP.buyangGajok.term} definition={TERM_MAP.buyangGajok.shortDef}>부양가족</Tooltip>,
      score: scoreResult.dependentsScore,
      maxScore: 35,
      reason: `함께 사는 가족 ${input.dependentsCount}명${input.dependentsCount >= 6 ? ' 이상' : ''}`,
      tip: '가족 1명마다 5점이에요 (6명 이상이면 만점)',
    },
    {
      key: 'subscription',
      label: <Tooltip term={TERM_MAP.tongjanG.term} definition={TERM_MAP.tongjanG.shortDef}>청약통장 가입 기간</Tooltip>,
      score: scoreResult.subscriptionScore,
      maxScore: 17,
      reason: subscriptionReason(input),
      tip: '통장을 오래 유지할수록 점수가 올라요',
    },
  ];

  const specialItems = [
    {
      key: 'newlyWed',
      label: <Tooltip term={TERM_MAP.sinholBubu.term} definition={TERM_MAP.sinholBubu.shortDef}>신혼부부 특별공급</Tooltip>,
      eligible: specialSupply.newlyWed,
      description: marriageDescription(input, specialSupply.newlyWed),
    },
    {
      key: 'firstHome',
      label: <Tooltip term={TERM_MAP.saengaeCheot.term} definition={TERM_MAP.saengaeCheot.shortDef}>생애최초 특별공급</Tooltip>,
      eligible: specialSupply.firstHome,
      description: '집을 가져본 적이 없고 청약통장에 12번 이상 냈다면 확인해 볼 수 있어요 (소득 등 다른 조건도 있어요)',
    },
    {
      key: 'multiChild',
      label: <Tooltip term={TERM_MAP.daJanyeo.term} definition={TERM_MAP.daJanyeo.shortDef}>다자녀 특별공급</Tooltip>,
      eligible: specialSupply.multiChild,
      description: `만 19세 미만 자녀 ${input.childrenCount ?? 0}명 · 3명 이상이 대상이에요`,
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-5 pt-4">
        <button
          onClick={onRecalculate}
          className="-ml-2 flex items-center gap-1 rounded-full px-2 py-2 text-sm text-gray-500 hover:bg-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          다시 계산하기
        </button>

        <section className="pt-6 pb-8">
          <p className="text-lg font-semibold text-gray-700">내 청약 가점은</p>
          <p className="mt-1 flex items-baseline gap-1 text-gray-900" aria-label={`${scoreResult.totalScore}점, 84점 만점`}>
            <span className="text-7xl font-bold tracking-tight tabular-nums text-blue-600">{displayScore}</span>
            <span className="text-2xl font-bold">점</span>
            <span className="ml-2 text-base text-gray-400">/ 84점</span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out"
              style={{ width: `${(displayScore / 84) * 100}%` }}
            />
          </div>
          <p className="mt-4">
            <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              {TIER_LABEL[scoreResult.tier]}
            </span>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{scoreResult.positioning}</p>
        </section>

        {showDeviceSaved && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3">
            <svg className="w-4 h-4 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700">이 기기에 저장했어요</span>
            <a
              href="/api/auth/kakao"
              onClick={markSyncAfterLogin}
              className="ml-auto whitespace-nowrap text-xs text-gray-500 hover:text-blue-600 hover:underline"
            >
              다른 기기에서도 보기
            </a>
          </div>
        )}
        {showAccountSaved && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3">
            <svg className="w-4 h-4 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700">내 계정에 저장했어요</span>
          </div>
        )}
        {showSaveError && (
          <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            계정에 저장하지 못했어요. 이 기기에는 저장돼 있어요.
          </div>
        )}

        <section className="border-t border-gray-100 py-8">
          <h2 className="text-lg font-bold text-gray-900">이렇게 계산됐어요</h2>
          <ul className="mt-5 space-y-6">
            {scoreItems.map((item) => (
              <li key={item.key}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold text-gray-800">{item.label}</span>
                  <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                    {item.score}
                    <span className="font-normal text-gray-400">/{item.maxScore}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width] duration-700"
                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">{item.reason}</p>
                {item.score < item.maxScore && <p className="mt-0.5 text-xs text-gray-400">{item.tip}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-100 py-8">
          <h2 className="text-lg font-bold text-gray-900">특별공급도 확인해 보세요</h2>
          <p className="mt-1 text-sm text-gray-500">
            <Tooltip term={TERM_MAP.teukbyeol.term} definition={TERM_MAP.teukbyeol.shortDef}>특별공급</Tooltip>은
            일반 청약과 따로 정해진 물량이에요.
          </p>
          <ul className="mt-5 space-y-3">
            {specialItems.map((item) => (
              <li
                key={item.key}
                className={`flex items-start justify-between gap-3 rounded-2xl px-4 py-4 ${
                  item.eligible ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div>
                  <p className={`text-[15px] font-semibold ${item.eligible ? 'text-gray-900' : 'text-gray-600'}`}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    item.eligible ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {item.eligible ? '가능해 보여요' : '해당 안 돼요'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-400">정확한 자격은 공고문과 청약홈에서 꼭 확인하세요.</p>
        </section>

        <Disclaimer />
        <div className="h-44" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white pt-3">
        <div className="max-w-md mx-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onAnnouncements}
            className="w-full rounded-2xl bg-blue-600 py-4 text-base font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.99]"
          >
            내 점수로 청약 공고 보기
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">로딩 중...</p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
