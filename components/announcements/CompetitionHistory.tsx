'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import type { Announcement, StoredScoreData } from '@/types';
import {
  AREA_BUCKET_LABEL,
  CHANCE_META,
  getChanceSuggestions,
  judgeChance,
  passedUnits,
  type BucketStats,
  type UnitResult,
} from '@/lib/competitionHistory';

interface HistoryData {
  region: string;
  months: number;
  complexCount: number;
  own: UnitResult[];
  stats: BucketStats[];
}

type HistoryState = { status: 'loading' } | { status: 'off' } | { status: 'ready'; data: HistoryData };

const MAX_SCORE = 84;

// 목업·임시 id(mock-001, api-0)는 청약홈 결과가 없으므로 조회하지 않는다
function useCompetitionHistory(houseManageNo: string, region: string): HistoryState {
  const key = /^\d+$/.test(houseManageNo) ? `${houseManageNo}|${region}` : '';
  const [result, setResult] = useState<{ key: string; state: HistoryState } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const params = new URLSearchParams({ houseManageNo, region });
    fetch(`/api/announcements/competition?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const state: HistoryState = json.enabled ? { status: 'ready', data: json } : { status: 'off' };
        setResult({ key, state });
      })
      .catch(() => !cancelled && setResult({ key, state: { status: 'off' } }));
    return () => {
      cancelled = true;
    };
  }, [key, houseManageNo, region]);

  if (!key) return { status: 'off' };
  return result?.key === key ? result.state : { status: 'loading' };
}

const formatRate = (u: UnitResult) =>
  u.rate !== null ? `${u.rate.toLocaleString()} : 1` : u.shortfall !== null ? `미달 ${u.shortfall}세대` : '-';

// 과거 당첨선으로 본 내 가능성 — 이 공고 실제 결과(마감 시) + 같은 시·도 최근 1년 민영 단지 당첨선
export function CompetitionHistory({
  announcement,
  scoreData,
}: {
  announcement: Announcement;
  scoreData: StoredScoreData | null;
}) {
  const state = useCompetitionHistory(announcement.id, announcement.region);

  if (state.status === 'off') return null;
  if (state.status === 'loading') {
    return (
      <div className="space-y-2 mb-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const { data } = state;
  const ownWithResult = data.own.filter((u) => u.lowest !== null || u.rate !== null || u.shortfall !== null);
  if (ownWithResult.length === 0 && data.stats.length === 0) return null;

  const myScore = scoreData?.result.totalScore;
  const isPublic = announcement.supplyKind === '국민';
  const judgeable = myScore !== undefined && !isPublic;
  const suggestions = judgeable ? getChanceSuggestions(myScore, data.stats, scoreData?.specialSupply) : [];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 mb-4">
      <p className="text-xs font-bold text-gray-800">
        과거 당첨선으로 본 내 가능성{' '}
        <Tooltip
          term="최저 당첨가점"
          definition="가점제로 당첨된 사람 중 가장 낮은 점수예요. 내 가점이 이 점수 이상이면 그 주택형에서 당첨권이었다는 뜻이에요. 면적대별 통계는 단지마다 당첨선이 가장 낮았던 주택형 기준이에요. 경쟁률은 1순위 해당지역 신청자 수 ÷ 공급 세대수예요."
        >
          <span className="text-blue-400 font-normal">ⓘ</span>
        </Tooltip>
      </p>

      {isPublic && (
        <p className="mt-1.5 text-[11px] text-gray-500">
          공공분양은 가점이 아니라 청약통장 납입 횟수 순으로 뽑아요. 아래 당첨선은 같은 지역 민영 단지 참고용이에요.
        </p>
      )}

      {ownWithResult.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">이 단지 실제 결과</p>
          <div className="space-y-1.5">
            {ownWithResult.map((u) => {
              const passed = judgeable && u.lowest !== null && myScore >= u.lowest;
              return (
                <div
                  key={u.houseType}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] ${passed ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}
                >
                  <span className="font-semibold text-gray-800">{u.houseType}</span>
                  <span className="ml-2">경쟁률 {formatRate(u)}</span>
                  {u.lowest !== null && (
                    <span className="ml-2">
                      당첨가점 최저 {u.lowest}
                      {u.average !== null && ` · 평균 ${u.average}`}점
                    </span>
                  )}
                  {passed && <span className="ml-1 font-semibold">✓ 내 가점 이상</span>}
                </div>
              );
            })}
          </div>
          {judgeable && passedUnits(myScore, ownWithResult).length === 0 && ownWithResult.some((u) => u.lowest !== null) && (
            <p className="mt-1.5 text-[11px] text-gray-500">내 가점 {myScore}점은 이 단지 당첨선보다 낮았어요</p>
          )}
        </div>
      )}

      {data.stats.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-gray-500 mb-2">
            최근 {data.months}개월 {data.region} 민영 {data.complexCount}개 단지 결과 기준
          </p>
          <div className="space-y-3">
            {data.stats.map((s) => (
              <BucketRow key={s.bucket} stats={s} myScore={judgeable ? myScore : undefined} />
            ))}
          </div>
        </div>
      )}

      {!scoreData && (
        <Link href="/calculator" className="mt-3 block text-[11px] font-semibold text-blue-600">
          가점을 계산하면 내 가능성을 알려드려요 →
        </Link>
      )}

      {suggestions.length > 0 && (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
          <p className="text-[11px] font-bold text-blue-800 mb-1">💡 제안</p>
          <ul className="space-y-0.5">
            {suggestions.map((s) => (
              <li key={s} className="text-[11px] leading-snug text-blue-900">· {s}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-[10px] text-gray-400 leading-snug">
        청약홈 공개 결과로 추정한 참고용 정보예요. 입지·분양가·추첨 물량에 따라 실제 당첨선은 달라질 수 있어요.
      </p>
    </div>
  );
}

function BucketRow({ stats, myScore }: { stats: BucketStats; myScore?: number }) {
  const chance = myScore !== undefined ? judgeChance(myScore, stats) : null;
  const pct = (n: number) => `${(n / MAX_SCORE) * 100}%`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-800">{AREA_BUCKET_LABEL[stats.bucket]}</span>
        {chance && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${CHANCE_META[chance.level].style}`}>
            {CHANCE_META[chance.level].label}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-600 mt-0.5">
        최저 당첨가점 {stats.lowestMedian}점 ({stats.lowestMin}~{stats.lowestMax})
        {stats.rateMedian !== null && ` · 경쟁률 ${stats.rateMedian.toLocaleString()} : 1`}
        <span className="text-gray-400"> · {stats.complexCount}개 단지</span>
      </p>
      <div className="relative mt-1.5 h-2 rounded-full bg-gray-100" aria-hidden>
        <div
          className="absolute h-2 rounded-full bg-blue-100"
          style={{ left: pct(stats.lowestMin), width: pct(stats.lowestMax - stats.lowestMin) }}
        />
        <div className="absolute h-2 w-0.5 bg-blue-500" style={{ left: pct(stats.lowestMedian) }} />
        {myScore !== undefined && (
          <div
            className="absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-orange-500 shadow"
            style={{ left: pct(Math.min(myScore, MAX_SCORE)) }}
          />
        )}
      </div>
      {chance && myScore !== undefined && (
        <p className="text-[11px] text-gray-500 mt-1">
          {chance.total}개 단지 중 {chance.passCount}곳은 내 가점({myScore}점)으로 당첨권인 주택형이 있었어요
        </p>
      )}
    </div>
  );
}
