'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Disclaimer from '@/components/Disclaimer';
import { calculateTotalScore, calculateSpecialSupply, getHomelessNextMilestone, getSubscriptionNextMilestone } from '@/lib/calculator';
import type { EligibilityInput, StoredScoreData } from '@/types';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const [showTable, setShowTable] = useState(false);

  const { scoreResult, specialSupply, input } = data;

  const homelessMilestone = input.isHomeless
    ? getHomelessNextMilestone(input.homelessYears)
    : null;
  const subscriptionMilestone = getSubscriptionNextMilestone(input.subscriptionStartDate);
  const maxAdditional =
    (32 - scoreResult.homelessScore) +
    (35 - scoreResult.dependentsScore) +
    (17 - scoreResult.subscriptionScore);

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

        {/* Score Improvement Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">점수 향상 가이드</h2>
            {maxAdditional > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-semibold">
                최대 +{maxAdditional}점 가능
              </span>
            )}
          </div>
          <div className="space-y-3">
            {/* 무주택 기간 */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">무주택 기간</span>
                <span className="text-xs text-gray-500">{scoreResult.homelessScore} / 32점</span>
              </div>
              {!input.isHomeless ? (
                <p className="text-xs text-gray-400">무주택자가 아니면 해당 없음 (0점)</p>
              ) : scoreResult.homelessScore >= 32 ? (
                <p className="text-xs text-green-600 font-semibold">최대 점수 달성!</p>
              ) : homelessMilestone ? (
                <p className="text-xs text-blue-600">
                  무주택 <span className="font-bold">{Math.ceil(homelessMilestone.neededYears * 12)}개월</span> 더 유지 시
                  {' '}<span className="font-bold text-blue-700">+{homelessMilestone.gainScore}점</span>
                  {' → '}{homelessMilestone.nextScore}점
                </p>
              ) : null}
              <p className="text-xs text-gray-400 mt-0.5">남은 잠재: +{32 - scoreResult.homelessScore}점</p>
            </div>

            {/* 부양가족 */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">부양가족 수</span>
                <span className="text-xs text-gray-500">{scoreResult.dependentsScore} / 35점</span>
              </div>
              {scoreResult.dependentsScore >= 35 ? (
                <p className="text-xs text-green-600 font-semibold">최대 점수 달성!</p>
              ) : (
                <p className="text-xs text-blue-600">
                  부양가족 1명 추가 시{' '}
                  <span className="font-bold text-blue-700">+5점</span>
                  {' → '}{scoreResult.dependentsScore + 5}점
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">남은 잠재: +{35 - scoreResult.dependentsScore}점</p>
            </div>

            {/* 청약통장 */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700">청약통장 가입기간</span>
                <span className="text-xs text-gray-500">{scoreResult.subscriptionScore} / 17점</span>
              </div>
              {scoreResult.subscriptionScore >= 17 ? (
                <p className="text-xs text-green-600 font-semibold">최대 점수 달성!</p>
              ) : subscriptionMilestone ? (
                <p className="text-xs text-blue-600">
                  <span className="font-bold">{subscriptionMilestone.nextDateLabel}</span>까지 유지 시
                  {' '}<span className="font-bold text-blue-700">+{subscriptionMilestone.gainScore}점</span>
                  {' → '}{subscriptionMilestone.nextScore}점
                  <span className="text-gray-400"> ({subscriptionMilestone.monthsLeft}개월 후)</span>
                </p>
              ) : null}
              <p className="text-xs text-gray-400 mt-0.5">남은 잠재: +{17 - scoreResult.subscriptionScore}점</p>
            </div>
          </div>
        </div>

        {/* Scoring Reference Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-base font-bold text-gray-900">배점 기준표</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showTable ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showTable && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
              {/* 무주택 기간 */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">무주택 기간 (최대 32점)</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left pb-1 font-medium">기간</th>
                      <th className="text-right pb-1 font-medium">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['1년 미만', 2], ['1년', 2], ['2년', 4], ['3년', 6], ['4년', 8],
                      ['5년', 10], ['6년', 12], ['7년', 14], ['8년', 16], ['9년', 18],
                      ['10년', 20], ['11년', 22], ['12년', 24], ['13년', 26], ['14년', 28],
                      ['15년', 30], ['16년 이상', 32],
                    ].map(([label, score]) => {
                      const isCurrentRow = input.isHomeless && scoreResult.homelessScore === score;
                      return (
                        <tr key={label} className={isCurrentRow ? 'bg-blue-50 rounded' : ''}>
                          <td className={`py-0.5 ${isCurrentRow ? 'text-blue-700 font-bold pl-1' : 'text-gray-600'}`}>{label}</td>
                          <td className={`text-right ${isCurrentRow ? 'text-blue-700 font-bold pr-1' : 'text-gray-600'}`}>{score}점</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 부양가족 */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">부양가족 수 (최대 35점)</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left pb-1 font-medium">인원</th>
                      <th className="text-right pb-1 font-medium">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['0명', 5], ['1명', 10], ['2명', 15], ['3명', 20], ['4명', 25], ['5명', 30], ['6명 이상', 35],
                    ].map(([label, score]) => {
                      const isCurrentRow = scoreResult.dependentsScore === score;
                      return (
                        <tr key={label} className={isCurrentRow ? 'bg-blue-50 rounded' : ''}>
                          <td className={`py-0.5 ${isCurrentRow ? 'text-blue-700 font-bold pl-1' : 'text-gray-600'}`}>{label}</td>
                          <td className={`text-right ${isCurrentRow ? 'text-blue-700 font-bold pr-1' : 'text-gray-600'}`}>{score}점</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 청약통장 */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">청약통장 가입기간 (최대 17점)</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left pb-1 font-medium">기간</th>
                      <th className="text-right pb-1 font-medium">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['1년 미만', 1], ['1년', 3], ['2년', 5], ['3년', 7], ['4년', 9],
                      ['5년', 11], ['6년', 13], ['7년', 15], ['8년 이상', 17],
                    ].map(([label, score]) => {
                      const isCurrentRow = scoreResult.subscriptionScore === score;
                      return (
                        <tr key={label} className={isCurrentRow ? 'bg-blue-50 rounded' : ''}>
                          <td className={`py-0.5 ${isCurrentRow ? 'text-blue-700 font-bold pl-1' : 'text-gray-600'}`}>{label}</td>
                          <td className={`text-right ${isCurrentRow ? 'text-blue-700 font-bold pr-1' : 'text-gray-600'}`}>{score}점</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
