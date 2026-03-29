'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Disclaimer from '@/components/Disclaimer';
import { calculateTotalScore, calculateSpecialSupply } from '@/lib/calculator';
import type { EligibilityInput, StoredScoreData } from '@/types';
import type { SessionUser } from '@/types/auth';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
      const parsed: EligibilityInput = JSON.parse(dataParam);
      return {
        input: parsed,
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
    if (!data || sessionUser === undefined || sessionUser === null) return;
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalScore: data.scoreResult.totalScore,
        housingScore: data.scoreResult.homelessScore,
        dependentScore: data.scoreResult.dependentsScore,
        subscriptionScore: data.scoreResult.subscriptionScore,
        tier: data.scoreResult.tier,
        specialSupply: data.specialSupply,
        inputSnapshot: data.input,
      }),
    })
      .then((res) => {
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      })
      .catch(() => setSaveStatus('error'));
  }, [data, sessionUser]);

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

  const { scoreResult, specialSupply, input } = data;

  const tierConfig = {
    S: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', label: 'S등급', emoji: '최우수' },
    A: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300', label: 'A등급', emoji: '우수' },
    B: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-300', label: 'B등급', emoji: '보통' },
    C: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-300', label: 'C등급', emoji: '개선 필요' },
  };

  const tc = tierConfig[scoreResult.tier];

  const scoreItems = [
    {
      label: '무주택 기간',
      score: scoreResult.homelessScore,
      maxScore: 32,
      description: input.isHomeless ? `${input.homelessYears}년` : '해당 없음',
    },
    {
      label: '부양가족 수',
      score: scoreResult.dependentsScore,
      maxScore: 35,
      description: `${input.dependentsCount}명`,
    },
    {
      label: '청약통장 가입기간',
      score: scoreResult.subscriptionScore,
      maxScore: 17,
      description: input.subscriptionStartDate || '미입력',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/calculator')}
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
            다시 계산하기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">나의 청약 결과</h1>
          <p className="text-gray-500 text-sm mt-1">
            참고용 결과입니다. 공식 결과는 청약홈에서 확인하세요.
          </p>
        </div>

        {/* Save Status Banner */}
        {sessionUser === null && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-gray-500 text-sm">로그인하면 결과를 저장할 수 있어요</span>
            <a href="/api/auth/kakao" className="ml-auto text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">카카오 로그인</a>
          </div>
        )}
        {sessionUser !== undefined && sessionUser !== null && saveStatus === 'saved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 text-sm font-medium">결과가 저장되었습니다</span>
          </div>
        )}
        {sessionUser !== undefined && sessionUser !== null && saveStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <span className="text-red-600 text-sm">저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</span>
          </div>
        )}

        {/* Score Summary Card */}
        <div className={`rounded-2xl p-6 mb-4 border-2 ${tc.bg} ${tc.border}`}>
          <div className="text-center">
            <div className="mb-3">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${tc.bg} ${tc.color} border ${tc.border}`}
              >
                {tc.label} · {tc.emoji}
              </span>
            </div>
            <div className="flex items-end justify-center gap-2 mb-2">
              <span className={`text-6xl font-black ${tc.color}`}>
                {scoreResult.totalScore}
              </span>
              <span className="text-gray-500 text-xl mb-2">/ 84점</span>
            </div>
            <div className="w-full bg-white rounded-full h-3 mb-3">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${
                  scoreResult.tier === 'S'
                    ? 'bg-yellow-500'
                    : scoreResult.tier === 'A'
                    ? 'bg-blue-500'
                    : scoreResult.tier === 'B'
                    ? 'bg-green-500'
                    : 'bg-gray-400'
                }`}
                style={{ width: `${(scoreResult.totalScore / 84) * 100}%` }}
              />
            </div>
            <p className={`text-sm font-medium ${tc.color}`}>
              {scoreResult.positioning}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">항목별 점수</h2>
          <div className="space-y-4">
            {scoreItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      ({item.description})
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {item.score}
                    <span className="text-gray-400 font-normal">
                      /{item.maxScore}
                    </span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${(item.score / item.maxScore) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Special Supply Eligibility */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            특별공급 자격 여부
          </h2>
          <div className="space-y-2">
            <SpecialBadge
              label="신혼부부 특별공급"
              eligible={specialSupply.newlyWed}
              description={
                !input.isMarried
                  ? '미혼'
                  : !input.marriageDate
                  ? '혼인 날짜 미입력'
                  : (() => {
                      const [y, m] = input.marriageDate.split('-').map(Number);
                      const diffMs = new Date().getTime() - new Date(y, m - 1, 1).getTime();
                      const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
                      const years = Math.floor(totalMonths / 12);
                      const months = totalMonths % 12;
                      const label = years > 0 ? `혼인 ${years}년 ${months > 0 ? `${months}개월` : ''}`.trim() : `혼인 ${months}개월`;
                      return specialSupply.newlyWed ? `${label} → 자격 있음` : `${label} → 7년 초과`;
                    })()
              }
            />
            <SpecialBadge
              label="생애최초 특별공급"
              eligible={specialSupply.firstHome}
              description="무주택 + 납입 12회 이상"
            />
            <SpecialBadge
              label="다자녀 특별공급"
              eligible={specialSupply.multiChild}
              description={`미성년 자녀 ${input.childrenCount ?? 0}명${specialSupply.multiChild ? ' → 자격 있음' : ' (3명 이상 필요)'}`}
            />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            * 정확한 특별공급 자격은 공고문 및 청약홈에서 반드시 확인하세요.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => router.push('/announcements')}
            className="flex-1 text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors px-6"
          >
            내 점수로 공고 보기
          </button>
          <button
            onClick={() => router.push('/calculator')}
            className="flex-1 text-center py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors px-6"
          >
            다시 계산하기
          </button>
        </div>

        <Disclaimer />
      </div>
    </main>
  );
}

function SpecialBadge({
  label,
  eligible,
  description,
}: {
  label: string;
  eligible: boolean;
  description: string;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl ${
        eligible ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <div>
        <p
          className={`text-sm font-semibold ${
            eligible ? 'text-green-700' : 'text-gray-500'
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          eligible
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {eligible ? '해당' : '미해당'}
      </span>
    </div>
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
